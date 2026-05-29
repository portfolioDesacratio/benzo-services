/* ============================================
   Услуги Бензо — JavaScript
   Supabase + Админ-панель + UI
   24/7 без сервера
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ─── SUPABASE CONFIG ─────────────────────────
    const SUPABASE_URL     = window.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
    const CONFIG_TABLE = 'config';

    // Supabase REST helper
    async function supabaseFetch(path, options = {}) {
        const url = `${SUPABASE_URL}/rest/v1/${path}`;
        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // If user is authenticated, use their JWT instead
        const session = getSession();
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Supabase ${res.status}: ${text}`);
        }
        return res;
    }

    // ─── SESSION MANAGEMENT ──────────────────────
    const SESSION_KEY = 'benzo_supabase_session';

    function getSession() {
        try {
            const s = sessionStorage.getItem(SESSION_KEY);
            return s ? JSON.parse(s) : null;
        } catch { return null; }
    }

    function saveSession(session) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    function isLoggedIn() {
        const s = getSession();
        if (!s?.access_token) return false;
        // Check expiry
        if (s.expires_at && Date.now() > s.expires_at * 1000) {
            clearSession();
            return false;
        }
        return true;
    }

    // ─── CONFIG READ/WRITE ───────────────────────

    async function fetchConfig() {
        try {
            const res = await supabaseFetch(`${CONFIG_TABLE}?select=key,value`);
            const rows = await res.json();
            const cfg = {};
            for (const r of rows) cfg[r.key] = r.value;
            return cfg;
        } catch (e) {
            console.warn('Config fetch failed:', e);
            return null;
        }
    }

    async function saveConfig(key, value) {
        // Upsert: try insert, on conflict update
        const body = { key, value };
        const res = await supabaseFetch(CONFIG_TABLE, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Prefer': 'resolution=merge-duplicates',
                'Accept': 'application/json',
            },
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        return true;
    }

    function applyConfig(config) {
        if (!config) return;
        for (const [key, val] of Object.entries(config)) {
            const el = document.querySelector(`[data-live="${key}"]`);
            if (!el) continue;

            if (key === 'greeting_text') {
                el.innerHTML = val.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            } else if (key === 'telegram' || key === 'channel') {
                const u = val.replace('@', '');
                el.textContent = val;
                el.dataset.copy = val;
                el.href = `https://t.me/${u}`;
            } else if (key.startsWith('price_')) {
                // Format as $XX
                const clean = val.replace(/[^0-9]/g, '');
                const formatted = clean ? `$${clean}` : val;
                el.textContent = formatted;
                // Also update the admin field if open
                const adminField = document.querySelector(`[data-config-key="${key}"]`);
                if (adminField) adminField.value = formatted;
            } else {
                el.textContent = val;
            }
        }
    }

    // ─── SUPABASE AUTH ───────────────────────────

    async function supabaseLogin(email, password) {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error_description || err.msg || 'Ошибка входа');
        }
        const data = await res.json();
        saveSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
            user: data.user,
        });
        return data;
    }

    async function supabaseLogout() {
        const session = getSession();
        if (session?.access_token) {
            try {
                await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                });
            } catch {}
        }
        clearSession();
    }

    // ─── PARTICLES ───────────────────────────────
    (function particles() {
        const canvas = document.getElementById('particles');
        if (!canvas) return;

        // Respect reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            canvas.style.display = 'none';
            return;
        }

        const ctx = canvas.getContext('2d');
        let w, h, particles = [];
        const COUNT = Math.min(120, Math.floor(window.innerWidth / 10));
        const CONNECT_DIST = 200;
        const SPEED = 0.4;
        const LINE_OPACITY = 0.35;

        function resize() {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        class P {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                const a = Math.random() * Math.PI * 2;
                this.vx = Math.cos(a) * SPEED + (Math.random() - 0.5) * SPEED * 0.5;
                this.vy = Math.sin(a) * SPEED + (Math.random() - 0.5) * SPEED * 0.5;
                this.s = Math.random() * 3.5 + 2;
                this.b = Math.random() * 0.6 + 0.4;
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.s, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(139, 92, 246, ${this.b})`;
                ctx.shadowColor = 'rgba(139, 92, 246, 0.6)';
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        for (let i = 0; i < COUNT; i++) particles.push(new P());

        function lines() {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < CONNECT_DIST) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(139, 92, 246, ${(1 - d / CONNECT_DIST) * LINE_OPACITY})`;
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, w, h);
            for (const p of particles) { p.update(); p.draw(); }
            lines();
            requestAnimationFrame(animate);
        }
        animate();
    })();

    // ─── MOBILE MENU ─────────────────────────────
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('nav');
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            nav.classList.toggle('open');
        });
        document.querySelectorAll('.nav-link').forEach(l => {
            l.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                nav.classList.remove('open');
            });
        });
    }

    // ─── HEADER SCROLL ────────────────────────────
    const header = document.querySelector('.header');
    if (header) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    header.classList.toggle('scrolled', window.scrollY > 50);
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // ─── SCROLL REVEAL ────────────────────────────
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        revealEls.forEach(el => observer.observe(el));
    }

    // ─── GREETING BANNER ──────────────────────────
    const banner = document.getElementById('greetingBanner');
    if (banner) {
        const dur = parseInt(banner.dataset.duration) || 5000;
        setTimeout(() => banner.classList.add('show'), 2000);
        setTimeout(() => banner.classList.remove('show'), 2000 + dur);
    }

    // ─── TOAST ────────────────────────────────────
    window.showToast = function (msg, dur = 3000) {
        const c = document.getElementById('toastContainer');
        if (!c) return;
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateY(-20px)';
            setTimeout(() => t.remove(), 400);
        }, dur);
    };

    // ─── CLIPBOARD ────────────────────────────────
    document.querySelectorAll('.contact-value').forEach(el => {
        el.addEventListener('click', async () => {
            const txt = el.dataset.copy || el.textContent;
            try {
                await navigator.clipboard.writeText(txt);
                const orig = el.textContent;
                el.textContent = '✓ Скопировано!';
                setTimeout(() => { el.textContent = orig; }, 1500);
            } catch { showToast('❌ Ошибка копирования'); }
        });
    });

    // ─── SMOOTH SCROLL ────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const h = a.getAttribute('href');
            if (h === '#') return;
            const t = document.querySelector(h);
            if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
        });
    });

    // ═══════════════════════════════════════════════
    // ─── ADMIN UI ─────────────────────────────────
    // ═══════════════════════════════════════════════

    const adminToggle = document.getElementById('adminToggle');
    const adminPanel = document.getElementById('adminPanel');
    const loginModal = document.getElementById('loginModal');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');
    const loginSubmit = document.getElementById('loginSubmit');
    const loginModalClose = document.getElementById('loginModalClose');
    const adminLogout = document.getElementById('adminLogout');
    const adminUserName = document.getElementById('adminUserName');
    const adminDbStatus = document.getElementById('adminDbStatus');

    function updateAdminUI() {
        // Кнопка ⚙ всегда видна
        adminToggle.style.display = 'flex';

        if (isLoggedIn()) {
            const s = getSession();
            const email = s?.user?.email || 'Админ';
            adminUserName.textContent = `👋 ${email}`;
        }
    }

    function openAdminPanel() {
        adminPanel.classList.add('open');
        adminToggle.textContent = '✕';
        // Load current config into fields
        fetchConfig().then(cfg => {
            if (!cfg) return;
            document.querySelectorAll('[data-config-key]').forEach(el => {
                const fk = el.dataset.configKey;
                if (cfg[fk] !== undefined) el.value = cfg[fk];
            });
        });
    }

    function closeAdminPanel() {
        adminPanel.classList.remove('open');
        adminToggle.textContent = '⚙';
    }

    // Admin toggle click
    adminToggle.addEventListener('click', async () => {
        if (adminPanel.classList.contains('open')) { closeAdminPanel(); return; }
        if (!isLoggedIn()) { showLoginModal(); return; }
        openAdminPanel();
    });

    // ─── LOGIN MODAL ──────────────────────────────

    function showLoginModal() {
        loginModal.classList.add('active');
        loginEmail.value = '';
        loginPassword.value = '';
        loginError.textContent = '';
        setTimeout(() => loginEmail.focus(), 100);
    }

    function hideLoginModal() { loginModal.classList.remove('active'); }

    loginSubmit.addEventListener('click', async () => {
        const email = loginEmail.value.trim();
        const pass = loginPassword.value.trim();
        if (!email || !pass) { loginError.textContent = 'Введи email и пароль'; return; }

        loginSubmit.disabled = true;
        loginSubmit.textContent = '⏳ Вход...';

        try {
            await supabaseLogin(email, pass);
            hideLoginModal();
            updateAdminUI();
            openAdminPanel();
            showToast('✅ Добро пожаловать!');
        } catch (e) {
            loginError.textContent = '❌ ' + e.message;
        }

        loginSubmit.disabled = false;
        loginSubmit.textContent = 'Войти';
    });

    loginPassword.addEventListener('keydown', e => {
        if (e.key === 'Enter') loginSubmit.click();
    });
    loginModalClose.addEventListener('click', hideLoginModal);
    loginModal.addEventListener('click', e => {
        if (e.target === loginModal) hideLoginModal();
    });

    // ─── LOGOUT ───────────────────────────────────

    adminLogout.addEventListener('click', async () => {
        await supabaseLogout();
        closeAdminPanel();
        updateAdminUI();
        showToast('👋 Вы вышли');
    });

    // ─── ADMIN SAVE ───────────────────────────────

    document.querySelectorAll('.admin-save').forEach(btn => {
        btn.addEventListener('click', async () => {
            const section = btn.closest('.admin-section');
            if (!section) return;
            if (!isLoggedIn()) { showToast('❌ Требуется вход'); return; }

            const updates = {};
            section.querySelectorAll('[data-config-key]').forEach(el => {
                updates[el.dataset.configKey] = el.value;
            });

            btn.disabled = true;
            btn.textContent = '⏳...';

            try {
                for (const [key, val] of Object.entries(updates)) {
                    await saveConfig(key, val);
                }
                // Re-apply to live DOM
                const cfg = await fetchConfig();
                applyConfig(cfg);
                showToast('✅ Сохранено для всех!');
            } catch (e) {
                showToast('❌ ' + e.message);
            }

            btn.disabled = false;
            btn.textContent = 'Сохранить';
        });
    });

    // ═══════════════════════════════════════════════
    // ─── INIT ─────────────────────────────────────
    // ═══════════════════════════════════════════════

    (async function init() {
        // 1. Load config from Supabase
        const cfg = await fetchConfig();
        applyConfig(cfg);

        // 2. Update admin UI state
        updateAdminUI();

        // 3. Check DB status
        if (adminDbStatus) {
            adminDbStatus.textContent = cfg ? '✅ Online' : '⚠️ No connection';
            adminDbStatus.style.color = cfg ? '#22c55e' : '#ef4444';
        }

        console.log('%c🛡️  Услуги Бензо v2.0', 'font-size:24px; font-weight:bold; color:#8b5cf6');
        console.log('%c   Supabase: ' + SUPABASE_URL, 'font-size:12px; color:#9090a8');
    })();

});
