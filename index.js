/* ============================================
   Услуги Бензо — JavaScript
   API + WebSocket + Админ-панель + UI
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ─── CONFIG ──────────────────────────────────
    const API = window.API_BASE_URL || 'http://localhost:3001';
    const WS_URL = window.WS_URL || 'ws://localhost:3001/ws';
    const SESSION_KEY = 'benzo_admin_session';

    // ─── PARTICLES ───────────────────────────────
    (function particles() {
        const canvas = document.getElementById('particles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let w, h, particles = [];
        const COUNT = Math.min(90, Math.floor(window.innerWidth / 12));
        const CONNECT_DIST = 180;
        const SPEED = 0.3;
        const LINE_OPACITY = 0.15;

        function resize() {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                const angle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(angle) * SPEED + (Math.random() - 0.5) * SPEED * 0.5;
                this.vy = Math.sin(angle) * SPEED + (Math.random() - 0.5) * SPEED * 0.5;
                this.size = Math.random() * 3 + 1.5;
                this.brightness = Math.random() * 0.5 + 0.5;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(139, 92, 246, ${this.brightness})`;
                ctx.fill();
                ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        for (let i = 0; i < COUNT; i++) particles.push(new Particle());

        function drawLines() {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECT_DIST) {
                        const opacity = (1 - dist / CONNECT_DIST) * LINE_OPACITY;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, w, h);
            for (const p of particles) { p.update(); p.draw(); }
            drawLines();
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
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
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
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        revealElements.forEach(el => observer.observe(el));
    }

    // ─── GREETING BANNER ──────────────────────────
    const greetingBanner = document.getElementById('greetingBanner');
    if (greetingBanner) {
        const showDuration = parseInt(greetingBanner.dataset.duration) || 5000;
        setTimeout(() => greetingBanner.classList.add('show'), 2000);
        setTimeout(() => greetingBanner.classList.remove('show'), 2000 + showDuration);
    }

    // ─── TOAST ────────────────────────────────────
    window.showToast = function (message, duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 400);
        }, duration);
    };

    // ─── CLIPBOARD ────────────────────────────────
    document.querySelectorAll('.contact-value').forEach(el => {
        el.addEventListener('click', async () => {
            const text = el.dataset.copy || el.textContent;
            try {
                await navigator.clipboard.writeText(text);
                const orig = el.textContent;
                el.textContent = '✓ Скопировано!';
                setTimeout(() => { el.textContent = orig; }, 1500);
            } catch {
                showToast('❌ Не удалось скопировать');
            }
        });
    });

    // ─── SMOOTH SCROLL ────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ═══════════════════════════════════════════════
    // ─── CONFIG FROM API ──────────────────────────
    // ═══════════════════════════════════════════════

    async function fetchConfig() {
        try {
            const res = await fetch(`${API}/api/config`);
            if (!res.ok) throw new Error('Network error');
            return await res.json();
        } catch {
            return null;
        }
    }

    function applyConfig(config) {
        if (!config) return;
        for (const [key, val] of Object.entries(config)) {
            const liveEl = document.querySelector(`[data-live="${key}"]`);
            if (!liveEl) continue;

            if (key === 'greeting_text') {
                liveEl.innerHTML = val.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            } else if (key === 'telegram' || key === 'channel') {
                const username = val.replace('@', '');
                liveEl.textContent = val;
                liveEl.setAttribute('data-copy', val);
                liveEl.href = `https://t.me/${username}`;
            } else {
                liveEl.textContent = val;
            }
        }
    }

    // Load config from API
    fetchConfig().then(cfg => {
        if (cfg) applyConfig(cfg);
    });

    // ═══════════════════════════════════════════════
    // ─── ADMIN AUTH ────────────────────────────────
    // ═══════════════════════════════════════════════

    const adminToggle = document.getElementById('adminToggle');
    const adminPanel = document.getElementById('adminPanel');
    const loginModal = document.getElementById('loginModal');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');
    const loginSubmit = document.getElementById('loginSubmit');
    const loginModalClose = document.getElementById('loginModalClose');
    const adminLogout = document.getElementById('adminLogout');
    const adminUserName = document.getElementById('adminUserName');
    const onlineBadge = document.getElementById('onlineBadge');
    const onlineCount = document.getElementById('onlineCount');
    const adminOnlineCount = document.getElementById('adminOnlineCount');
    const adminApiStatus = document.getElementById('adminApiStatus');

    let adminSession = null;

    // Load session from sessionStorage
    try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) adminSession = JSON.parse(saved);
    } catch {}

    function isAdmin() {
        return adminSession && adminSession.token;
    }

    function saveSession(session) {
        adminSession = session;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    function clearSession() {
        adminSession = null;
        sessionStorage.removeItem(SESSION_KEY);
    }

    async function verifySession() {
        if (!adminSession?.token) return false;
        try {
            const res = await fetch(`${API}/api/auth/verify`, {
                headers: { Authorization: `Bearer ${adminSession.token}` }
            });
            const data = await res.json();
            if (data.valid) {
                adminSession.adminName = data.adminName;
                saveSession(adminSession);
                return true;
            }
        } catch {}
        clearSession();
        return false;
    }

    async function login(password) {
        try {
            const res = await fetch(`${API}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (data.token) {
                saveSession(data);
                return true;
            }
            loginError.textContent = data.error || 'Неверный пароль';
            return false;
        } catch {
            loginError.textContent = '❌ Сервер недоступен';
            return false;
        }
    }

    // ─── ADMIN UI STATE ───────────────────────────

    function updateAdminUI() {
        const admin = isAdmin();

        // Admin toggle button visibility
        adminToggle.style.display = admin ? 'flex' : 'none';

        // Online badge visibility
        onlineBadge.style.display = admin ? 'inline-flex' : 'none';

        // Admin panel user name
        if (admin && adminSession?.adminName) {
            adminUserName.textContent = `👋 ${adminSession.adminName}`;
        }

        // API status in admin panel
        if (admin && adminApiStatus) {
            adminApiStatus.textContent = '✅ Онлайн';
            adminApiStatus.style.color = '#22c55e';
        }
    }

    function openAdminPanel() {
        adminPanel.classList.add('open');
        adminToggle.textContent = '✕';
        // Load current config into admin fields
        fetchConfig().then(cfg => {
            if (!cfg) return;
            document.querySelectorAll('[data-config-key]').forEach(el => {
                const sectionKey = el.closest('[data-config]')?.dataset.config;
                const fieldKey = el.dataset.configKey;
                if (sectionKey && cfg[fieldKey] !== undefined) {
                    el.value = cfg[fieldKey];
                }
            });
        });
    }

    function closeAdminPanel() {
        adminPanel.classList.remove('open');
        adminToggle.textContent = '⚙';
    }

    // ─── ADMIN TOGGLE ─────────────────────────────

    adminToggle.addEventListener('click', async () => {
        if (adminPanel.classList.contains('open')) {
            closeAdminPanel();
            return;
        }

        if (!isAdmin()) {
            showLoginModal();
            return;
        }

        // Verify session is still valid
        const valid = await verifySession();
        if (!valid) {
            showLoginModal();
            return;
        }

        openAdminPanel();
    });

    // ─── LOGIN MODAL ──────────────────────────────

    function showLoginModal() {
        loginModal.classList.add('active');
        loginPassword.value = '';
        loginError.textContent = '';
        setTimeout(() => loginPassword.focus(), 100);
    }

    function hideLoginModal() {
        loginModal.classList.remove('active');
    }

    loginSubmit.addEventListener('click', async () => {
        const pw = loginPassword.value.trim();
        if (!pw) { loginError.textContent = 'Введите пароль'; return; }

        loginSubmit.disabled = true;
        loginSubmit.textContent = '⏳ Проверка...';

        const ok = await login(pw);

        loginSubmit.disabled = false;
        loginSubmit.textContent = 'Войти';

        if (ok) {
            hideLoginModal();
            updateAdminUI();
            openAdminPanel();
            showToast(`✅ Добро пожаловать, ${adminSession.adminName}!`);
        }
    });

    loginPassword.addEventListener('keydown', e => {
        if (e.key === 'Enter') loginSubmit.click();
    });

    loginModalClose.addEventListener('click', hideLoginModal);
    loginModal.addEventListener('click', e => {
        if (e.target === loginModal) hideLoginModal();
    });

    // ─── LOGOUT ───────────────────────────────────

    adminLogout.addEventListener('click', () => {
        clearSession();
        closeAdminPanel();
        updateAdminUI();
        showToast('👋 Вы вышли из админ-панели');
    });

    // ═══════════════════════════════════════════════
    // ─── ADMIN PANEL SAVE ─────────────────────────
    // ═══════════════════════════════════════════════

    document.querySelectorAll('.admin-save').forEach(btn => {
        btn.addEventListener('click', async () => {
            const section = btn.closest('.admin-section');
            if (!section) return;
            const sectionKey = section.dataset.config;
            if (!sectionKey || !isAdmin()) return;

            const payload = {};
            section.querySelectorAll('[data-config-key]').forEach(el => {
                const fieldKey = el.dataset.configKey;
                payload[fieldKey] = el.value;
            });

            btn.disabled = true;
            btn.textContent = '⏳ Сохранение...';

            try {
                const res = await fetch(`${API}/api/config`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminSession.token}`
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    applyConfig(data.config);
                    showToast('✅ Настройки сохранены для всех!');
                } else {
                    showToast('❌ Ошибка сохранения');
                }
            } catch {
                showToast('❌ Сервер недоступен');
            }

            btn.disabled = false;
            btn.textContent = 'Сохранить';
        });
    });

    // ═══════════════════════════════════════════════
    // ─── WEB SOCKET (ONLINE COUNT) ────────────────
    // ═══════════════════════════════════════════════

    function connectWS() {
        let ws;
        let reconnectTimer;

        function connect() {
            try {
                ws = new WebSocket(WS_URL);
            } catch {
                scheduleReconnect();
                return;
            }

            ws.onopen = () => {
                console.log('🔌 WS connected');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'online_count') {
                        const count = data.count;
                        if (onlineCount) onlineCount.textContent = count;
                        if (adminOnlineCount) adminOnlineCount.textContent = count;
                    }
                } catch {}
            };

            ws.onclose = () => {
                console.log('🔌 WS disconnected');
                scheduleReconnect();
            };

            ws.onerror = () => {
                ws.close();
            };
        }

        function scheduleReconnect() {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connect, 5000);
        }

        connect();

        // Return cleanup
        return () => {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (ws) ws.close();
        };
    }

    // Start WS
    const disconnectWS = connectWS();

    // ═══════════════════════════════════════════════
    // ─── INIT ─────────────────────────────────────
    // ═══════════════════════════════════════════════

    (async function init() {
        // Verify existing session
        if (isAdmin()) {
            const valid = await verifySession();
            if (!valid) clearSession();
        }
        updateAdminUI();

        // If admin is logged in, auto-open panel? No, just show the button.
        // Update API status in admin panel
        if (adminApiStatus) {
            try {
                const res = await fetch(`${API}/api/health`);
                const data = await res.json();
                if (data.ok) {
                    adminApiStatus.textContent = '✅ Онлайн';
                    adminApiStatus.style.color = '#22c55e';
                }
            } catch {
                adminApiStatus.textContent = '❌ Офлайн';
                adminApiStatus.style.color = '#ef4444';
            }
        }
    })();

    console.log('%c🛡️  Услуги Бензо v2.0', 'font-size:24px; font-weight:bold; color:#8b5cf6');
    console.log('%c   API: ' + API, 'font-size:12px; color:#9090a8');
    console.log('%c   WS : ' + WS_URL, 'font-size:12px; color:#9090a8');

});
