document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});


document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('[data-widgets-grid]');
  const filterSelect = document.querySelector('[data-filter-select]');
  const loadMoreBtn = document.querySelector('[data-load-more]');

  if (!grid || !filterSelect || !loadMoreBtn) return;

  const state = {
    currentFilter: 'all',
    cursor: null,
    pageSize: 12,
    isLoading: false,
    hasMore: true,
  };

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatUSD(value) {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
    } catch (_) {
      return `$${(value || 0).toFixed(2)}`;
    }
  }

  function buildPreviewSrcdoc(innerHtml) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/lib/core.css">
<style>
  html,body{height:100%;transform-origin: 0 0;transform: scale(0.8);} 
  body{margin: 24% 0px 0px 40%;display:flex;align-items:center;justify-content:center;background:transparent}
</style>
</head><body>${innerHtml}</body></html>`;
  }

  // modal preview wiring (reuse structure from internal app)
  const viewModalToggle = document.getElementById('viewWidgetToggle');
  const viewModal = document.querySelector('[data-view-widget-modal]');
  const viewContainer = viewModal ? viewModal.querySelector('[data-view-iframe]') : null;

  function openViewModal(innerHtml) {
    if (!viewModal || !viewContainer) return;
    if (viewModalToggle) viewModalToggle.checked = true;
    viewModal.setAttribute('aria-hidden', 'false');
    viewContainer.innerHTML = '';
    const frame = document.createElement('iframe');
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = '0';
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.srcdoc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/lib/core.css"><style>html,body{height:100%;}body{margin:0;display:flex;align-items:center;justify-content:center;background:#ffffff}:root{color-scheme: light}</style></head><body>${innerHtml}</body></html>`;
    viewContainer.appendChild(frame);
  }

  function closeViewModal() {
    if (viewModalToggle) viewModalToggle.checked = false;
    if (viewModal) viewModal.setAttribute('aria-hidden', 'true');
    if (viewContainer) viewContainer.innerHTML = '';
  }

  if (viewModal) {
    const overlay = viewModal.querySelector('.modal-overlay');
    if (overlay) overlay.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeViewModal(); });
    const closeEls = viewModal.querySelectorAll('[data-close-view-widget]');
    closeEls.forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeViewModal(); }));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewModalToggle && viewModalToggle.checked) {
      closeViewModal();
    }
  });

  function clearGrid() {
    grid.innerHTML = '';
  }

  function appendCard(item) {
    const card = document.createElement('article');
    card.className = 'product-card';
    const priceText = item.priceCents && item.priceCents > 0 ? formatUSD((item.priceCents || 0) / 100) : 'Free';
    card.innerHTML = `
      <div class="product-thumb">
        <div class="product-preview">
          <div class="product-preview-canvas"></div>
        </div>
      </div>
      <div class="product-body">
        <h3>${escapeHtml(item.title || item.name)}</h3>
        <div class="product-price">${priceText}</div>
        <div class="hero-actions">
          <button type="button" class="btn ghost" data-view-widget>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            Preview
          </button>
          ${Number(item.priceCents || 0) === 0 ? `
          <a class="btn ghost" data-download-widget href="/api/widgets/${encodeURIComponent(item.id || '')}/download">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M7 12l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Download
          </a>
          ` : ''}
        </div>
      </div>
    `;
    const canvas = card.querySelector('.product-preview-canvas');
    if (canvas && item.previewHtml) {
      const frame = document.createElement('iframe');
      frame.setAttribute('loading', 'lazy');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.border = '0';
      frame.srcdoc = buildPreviewSrcdoc(String(item.previewHtml || ''));
      canvas.appendChild(frame);
    }
    const viewBtn = card.querySelector('[data-view-widget]');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => openViewModal(String(item.previewHtml || '')));
    }
    // Gate de login para Download (Free)
    const dl = card.querySelector('[data-download-widget]');
    if (dl) {
      dl.addEventListener('click', async (e) => {
        // checa login
        try {
          e.preventDefault();
          const statusResp = await fetch('/auth/status', { cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
          const status = statusResp.ok ? await statusResp.json() : { authenticated: false };
          if (!status.authenticated) {
            window.location.href = '/auth/google';
            return;
          }
          window.location.href = dl.getAttribute('href');
        } catch (_) {
          window.location.href = '/auth/google';
        }
      });
    }
    grid.appendChild(card);
  }

  function setLoading(isLoading) {
    state.isLoading = isLoading;
    loadMoreBtn.disabled = isLoading;
  }

  function updateLoadMoreVisibility() {
    if (state.hasMore && state.cursor) {
      loadMoreBtn.style.display = '';
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }

  async function fetchAndRender({ reset = false } = {}) {
    if (state.isLoading) return;
    setLoading(true);
    try {
      if (reset) {
        clearGrid();
        state.cursor = null;
        state.hasMore = true;
      }
      const params = new URLSearchParams();
      params.set('price', state.currentFilter);
      params.set('limit', String(state.pageSize));
      if (state.cursor) params.set('before', state.cursor);

      const resp = await fetch(`/api/public/widgets?${params.toString()}`, { cache: 'no-store' });
      if (!resp.ok) throw new Error('Failed to load widgets');
      const data = await resp.json();
      const items = Array.isArray(data.items) ? data.items : [];
      for (const item of items) appendCard(item);
      state.cursor = data.nextCursor || null;
      state.hasMore = Boolean(data.hasMore && state.cursor);
      updateLoadMoreVisibility();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      state.hasMore = false;
      updateLoadMoreVisibility();
    } finally {
      setLoading(false);
    }
  }

  // init
  filterSelect.value = state.currentFilter;
  fetchAndRender({ reset: true });

  filterSelect.addEventListener('change', () => {
    state.currentFilter = filterSelect.value || 'all';
    fetchAndRender({ reset: true });
  });

  loadMoreBtn.addEventListener('click', () => {
    if (!state.hasMore) return;
    fetchAndRender({ reset: false });
  });
});

