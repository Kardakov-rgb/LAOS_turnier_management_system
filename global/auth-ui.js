import authService from './auth-service.js';

function init() {
  injectStyles();
  injectAdminButton();
  injectLoginModal();
  wireEvents();

  authService.onStateChange((user) => {
    updateButton(user);
  });
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* ---- Write-Controls im Nur-Lesen-Modus sperren ---- */
    body:not(.auth-admin) .admin-nav-item {
      display: none;
    }
    body:not(.auth-admin) .action-emoji-btn,
    body:not(.auth-admin) .score-input,
    body:not(.auth-admin) .header-btn,
    body:not(.auth-admin) .delete-bet-btn,
    body:not(.auth-admin) .edit-team-btn,
    body:not(.auth-admin) .delete-team-btn {
      opacity: 0.3;
      pointer-events: none;
      cursor: not-allowed;
      filter: grayscale(50%);
    }

    /* Nur-Lesen-Badge neben Admin-Button */
    #readonly-badge {
      font-size: 0.68rem;
      color: rgba(255,255,255,0.45);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 3px;
      padding: 0.1rem 0.4rem;
      letter-spacing: 0.03em;
      margin-left: 2px;
    }
    body.auth-admin #readonly-badge {
      display: none;
    }

    #admin-nav-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.2);
      color: white;
      font-family: var(--font-primary);
      font-size: 0.85rem;
      font-weight: 500;
      padding: 0.35rem 0.8rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    #admin-nav-btn:hover {
      background: rgba(255,255,255,0.18);
    }
    #admin-nav-btn.logged-in {
      border-color: rgba(173, 221, 200, 0.6);
      color: #ADDDC8;
    }
    #admin-nav-btn .admin-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ADDDC8;
      display: none;
    }
    #admin-nav-btn.logged-in .admin-dot {
      display: inline-block;
    }

    #auth-modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    #auth-modal-overlay.visible {
      display: flex;
    }
    #auth-modal {
      background: rgba(20, 20, 35, 0.92);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(142, 145, 223, 0.35);
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 360px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      color: white;
      font-family: var(--font-primary);
    }
    #auth-modal h2 {
      font-size: 1.3rem;
      margin-bottom: 1.5rem;
      text-align: center;
      color: var(--color-blue-light, #b0b2eb);
    }
    #auth-modal .auth-field {
      margin-bottom: 1rem;
    }
    #auth-modal .auth-field label {
      display: block;
      font-size: 0.8rem;
      margin-bottom: 0.4rem;
      color: rgba(255,255,255,0.7);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    #auth-modal .auth-field input {
      width: 100%;
      padding: 0.65rem 0.9rem;
      border-radius: 6px;
      border: 1px solid rgba(142, 145, 223, 0.3);
      background: rgba(255,255,255,0.07);
      color: white;
      font-family: var(--font-primary);
      font-size: 0.95rem;
      transition: border-color 0.2s;
    }
    #auth-modal .auth-field input:focus {
      outline: none;
      border-color: var(--color-blue-light, #b0b2eb);
    }
    #auth-error {
      color: #ff7070;
      font-size: 0.82rem;
      margin-bottom: 1rem;
      text-align: center;
      min-height: 1.2em;
    }
    #auth-modal .auth-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    #auth-modal .auth-actions button {
      flex: 1;
      padding: 0.65rem;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-family: var(--font-primary);
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    #auth-login-btn {
      background: var(--color-orange, #FF6600);
      color: white;
    }
    #auth-login-btn:hover {
      background: var(--color-orange-dark, #cc5200);
    }
    #auth-login-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    #auth-cancel-btn {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    #auth-cancel-btn:hover {
      background: rgba(255,255,255,0.18);
    }
    #auth-logout-section {
      display: none;
      text-align: center;
    }
    #auth-logout-section p {
      font-size: 0.9rem;
      margin-bottom: 1.2rem;
      color: rgba(255,255,255,0.75);
    }
    #auth-logout-section strong {
      color: #ADDDC8;
    }
    #auth-logout-btn {
      background: rgba(213, 15, 13, 0.7);
      color: white;
      padding: 0.6rem 1.5rem;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-family: var(--font-primary);
      font-size: 0.9rem;
      font-weight: 600;
      transition: background 0.2s;
    }
    #auth-logout-btn:hover {
      background: rgba(213, 15, 13, 0.9);
    }
  `;
  document.head.appendChild(style);
}

function injectAdminButton() {
  const nav = document.querySelector('.nav-list');
  if (!nav) return;

  const li = document.createElement('li');
  li.className = 'nav-item';
  li.innerHTML = `
    <button id="admin-nav-btn" title="Admin-Login">
      <span class="admin-dot"></span>
      <span id="admin-btn-label">🔒 Admin</span>
      <span id="readonly-badge">Nur-Lesen</span>
    </button>
  `;
  nav.appendChild(li);
}

function injectLoginModal() {
  const overlay = document.createElement('div');
  overlay.id = 'auth-modal-overlay';
  overlay.innerHTML = `
    <div id="auth-modal" role="dialog" aria-modal="true" aria-label="Admin Login">
      <h2>Admin-Bereich</h2>

      <div id="auth-login-section">
        <div class="auth-field">
          <label for="auth-email">E-Mail</label>
          <input type="email" id="auth-email" autocomplete="username" placeholder="admin@example.com">
        </div>
        <div class="auth-field">
          <label for="auth-password">Passwort</label>
          <input type="password" id="auth-password" autocomplete="current-password" placeholder="••••••••">
        </div>
        <div id="auth-error"></div>
        <div class="auth-actions">
          <button id="auth-cancel-btn">Abbrechen</button>
          <button id="auth-login-btn">Einloggen</button>
        </div>
      </div>

      <div id="auth-logout-section">
        <p>Eingeloggt als<br><strong id="auth-user-email"></strong></p>
        <button id="auth-logout-btn">Ausloggen</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function wireEvents() {
  const overlay = document.getElementById('auth-modal-overlay');
  const adminBtn = document.getElementById('admin-nav-btn');
  const loginBtn = document.getElementById('auth-login-btn');
  const cancelBtn = document.getElementById('auth-cancel-btn');
  const logoutBtn = document.getElementById('auth-logout-btn');
  const passwordInput = document.getElementById('auth-password');

  adminBtn?.addEventListener('click', () => overlay.classList.add('visible'));

  cancelBtn?.addEventListener('click', closeModal);

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && overlay?.classList.contains('visible')) {
      if (!authService.isLoggedIn()) attemptLogin();
    }
  });

  loginBtn?.addEventListener('click', attemptLogin);

  logoutBtn?.addEventListener('click', async () => {
    await authService.logout();
    closeModal();
  });
}

async function attemptLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');
  const loginBtn = document.getElementById('auth-login-btn');

  errorEl.textContent = '';
  loginBtn.disabled = true;
  loginBtn.textContent = '…';

  try {
    await authService.login(email, password);
    closeModal();
  } catch (err) {
    errorEl.textContent = mapAuthError(err.code);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Einloggen';
  }
}

function closeModal() {
  document.getElementById('auth-modal-overlay')?.classList.remove('visible');
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-password').value = '';
}

function updateButton(user) {
  const btn = document.getElementById('admin-nav-btn');
  const label = document.getElementById('admin-btn-label');
  const loginSection = document.getElementById('auth-login-section');
  const logoutSection = document.getElementById('auth-logout-section');
  const userEmailEl = document.getElementById('auth-user-email');

  if (!btn) return;

  if (user) {
    document.body.classList.add('auth-admin');
    btn.classList.add('logged-in');
    if (label) label.textContent = 'Admin ✓';
    if (loginSection) loginSection.style.display = 'none';
    if (logoutSection) logoutSection.style.display = 'block';
    if (userEmailEl) userEmailEl.textContent = user.email;
  } else {
    document.body.classList.remove('auth-admin');
    btn.classList.remove('logged-in');
    if (label) label.textContent = '🔒 Admin';
    if (loginSection) loginSection.style.display = 'block';
    if (logoutSection) logoutSection.style.display = 'none';
  }
}

function mapAuthError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Ungültige E-Mail-Adresse.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-Mail oder Passwort falsch.';
    case 'auth/too-many-requests':
      return 'Zu viele Versuche. Kurz warten.';
    default:
      return 'Login fehlgeschlagen. Bitte nochmal versuchen.';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
