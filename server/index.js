/* ============================================
   Услуги Бензо — Backend API
   Express + sql.js (SQLite WASM) + WebSocket
   Деплой: Railway / Render / Fly.io
   24/7 без твоего компьютера
   ============================================ */

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ─── ENV ───────────────────────────────────────
const PORT         = process.env.PORT || 3001;
const ADMIN_PASS_1 = process.env.ADMIN_PASS_1 || null;
const ADMIN_PASS_2 = process.env.ADMIN_PASS_2 || null;
const CORS_ORIGIN  = process.env.CORS_ORIGIN || '*';
const DB_PATH      = process.env.DB_PATH || path.join(__dirname, 'data.db');

if (!ADMIN_PASS_1 && !ADMIN_PASS_2) {
  console.warn('⚠  ADMIN_PASS_1 / ADMIN_PASS_2 не заданы! Админ-панель недоступна.');
}

// ─── DB (sql.js WASM) ─────────────────────────
let db = null;
let SQL = null;

function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('❌ DB save error:', e.message);
  }
}

function initDb() {
  if (!db) return;

  db.run('CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL)');

  const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
  const upsert = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');

  const defaults = {
    greeting_text: 'Приветствуем на <strong>Услуги Бензо</strong>! Ознакомьтесь с нашими услугами.',
    telegram: '@murderirl',
    channel: '@god_benzo',
  };

  for (const [k, v] of Object.entries(defaults)) {
    stmt.bind([k]);
    if (!stmt.step()) upsert.run([k, v]);
    stmt.reset();
  }
  stmt.free();
  upsert.free();

  saveDb();
  console.log('📦 DB initialized');
}

function getConfig() {
  if (!db) return {};
  const stmt = db.prepare('SELECT key, value FROM config');
  const results = {};
  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (row && row.key) results[row.key] = row.value;
  }
  stmt.free();
  return results;
}

function setConfig(key, value) {
  if (!db) return;
  const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
  stmt.run([key, String(value)]);
  stmt.free();
  saveDb();
}

// ─── SESSIONS (in-memory) ──────────────────────
const sessions = new Map();

function createSession(adminName) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { adminName, expiresAt: Date.now() + 86400000 });
  return token;
}

function verifySession(token) {
  if (!token || !sessions.has(token)) return null;
  const s = sessions.get(token);
  if (s.expiresAt < Date.now()) { sessions.delete(token); return null; }
  return s;
}

// ─── EXPRESS ────────────────────────────────────
const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), online: clients.size });
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Требуется пароль' });

  let adminName = null;
  if (ADMIN_PASS_1 && password === ADMIN_PASS_1) adminName = 'Ты';
  else if (ADMIN_PASS_2 && password === ADMIN_PASS_2) adminName = 'Бензо';

  if (!adminName) return res.status(401).json({ error: 'Неверный пароль' });

  const token = createSession(adminName);
  res.json({ token, adminName });
});

app.get('/api/auth/verify', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const session = verifySession(token);
  if (!session) return res.status(401).json({ valid: false });
  res.json({ valid: true, adminName: session.adminName });
});

// Config (public GET)
app.get('/api/config', (_req, res) => {
  try {
    res.json(getConfig());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Config (admin PUT)
app.put('/api/config', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const session = verifySession(token);
  if (!session) return res.status(401).json({ error: 'Неавторизован' });

  try {
    const allowed = ['greeting_text', 'telegram', 'channel'];
    const body = req.body || {};
    for (const key of allowed) {
      if (body[key] !== undefined) setConfig(key, String(body[key]));
    }
    res.json({ success: true, config: getConfig() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '..')));

// ─── HTTP SERVER ────────────────────────────────
const server = http.createServer(app);

// ─── WEB SOCKET (online count) ──────────────────
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

function broadcastOnline() {
  const msg = JSON.stringify({ type: 'online_count', count: clients.size });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`🔌 WS +1  (${ip})`);

  ws.isAlive = true;
  clients.add(ws);
  broadcastOnline();

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('close', () => {
    clients.delete(ws);
    broadcastOnline();
  });

  ws.on('error', () => {
    clients.delete(ws);
    broadcastOnline();
  });
});

// Heartbeat ping every 30s
const hb = setInterval(() => {
  for (const ws of clients) {
    if (!ws.isAlive) { clients.delete(ws); ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
  broadcastOnline();
}, 30000);

wss.on('close', () => clearInterval(hb));

// ─── ASYNC BOOT ─────────────────────────────────
async function start() {
  // Init sql.js
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();

  // Load or create DB
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
    console.log(`📦 DB loaded: ${DB_PATH} (${buf.length} bytes)`);
  } else {
    db = new SQL.Database();
    console.log('📦 New DB created');
  }

  initDb();

  server.listen(PORT, () => {
    console.log(`\n🚀  Услуги Бензо — API server`);
    console.log(`    URL : http://localhost:${PORT}`);
    console.log(`    WS  : ws://localhost:${PORT}/ws`);
    console.log(`    DB  : ${DB_PATH}`);
    console.log(`    Admins: Ты ${ADMIN_PASS_1 ? '✅' : '❌'} | Бензо ${ADMIN_PASS_2 ? '✅' : '❌'}`);
    console.log(`    CORS : ${CORS_ORIGIN}\n`);
  });
}

start().catch(e => {
  console.error('❌ Failed to start:', e);
  process.exit(1);
});
