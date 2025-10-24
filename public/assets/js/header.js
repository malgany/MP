document.addEventListener('DOMContentLoaded', () => {
  const cta = document.querySelector('[data-auth-cta]');
  const nav = document.querySelector('.main-nav');
  const isAppPage = typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/app');
  const storageKey = 'auth:loggedIn';

  function ensureMyWidgetsLink() {
    if (!nav) return null;
    let link = nav.querySelector('[data-my-widgets]');
    if (!link) {
      link = document.createElement('a');
      link.className = 'nav-link';
      link.href = '/app';
      link.textContent = 'My Widgets';
      link.setAttribute('data-my-widgets', '');
      nav.appendChild(link);
    }
    return link;
  }

  function removeMyWidgetsLink() {
    const link = nav ? nav.querySelector('[data-my-widgets]') : null;
    if (link && link.parentElement) link.parentElement.removeChild(link);
  }

  async function getAuthStatus() {
    try {
      const resp = await fetch('/auth/status', { cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (!resp.ok) return { authenticated: false };
      return await resp.json();
    } catch (_) {
      return { authenticated: false };
    }
  }

  function wireLogout(el) {
    if (!el) return;
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        try { localStorage.removeItem(storageKey); } catch (_) {}
        await fetch('/auth/logout', { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      } catch (_) {
      } finally {
        window.location.href = '/';
      }
    }, { once: true });
  }

  (async function init() {
    let authenticated = false;
    try {
      const status = await getAuthStatus();
      authenticated = Boolean(status && status.authenticated);
      if (authenticated) {
        try { localStorage.setItem(storageKey, '1'); } catch (_) {}
      }
    } catch (_) {}
    if (!authenticated && isAppPage) {
      // fallback: se estamos dentro de /app, o usuário está autenticado
      authenticated = true;
      try { localStorage.setItem(storageKey, '1'); } catch (_) {}
    }
    if (!authenticated) {
      try { authenticated = localStorage.getItem(storageKey) === '1'; } catch (_) {}
    }

    if (authenticated) {
      ensureMyWidgetsLink();
      if (cta) {
        cta.textContent = 'Logout';
        cta.href = '#logout';
        cta.setAttribute('data-logout', '');
        wireLogout(cta);
      }
    } else {
      removeMyWidgetsLink();
      if (cta) {
        cta.textContent = 'Entrar com Google';
        cta.href = '/auth/google';
        cta.removeAttribute('data-logout');
      }
    }
  })();
});


