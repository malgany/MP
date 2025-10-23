document.addEventListener('DOMContentLoaded', () => {
  const logoutButton = document.querySelector('[data-logout]');
  const openAddBtn = document.querySelector('[data-open-add-widget]');
  const modalToggle = document.getElementById('addWidgetToggle');
  const modal = document.querySelector('[data-add-widget-modal]');
  const closeModalEls = modal ? modal.querySelectorAll('[data-close-add-widget]') : [];
  const uploadBtn = modal ? modal.querySelector('[data-upload-widget]') : null;
  const fileInput = modal ? modal.querySelector('[data-widget-file]') : null;
  const previewBlock = modal ? modal.querySelector('[data-preview-block]') : null;
  const previewContainer = modal ? modal.querySelector('[data-widget-preview]') : null;
  const form = modal ? modal.querySelector('[data-widget-form]') : null;
  const titleInput = modal ? modal.querySelector('[data-widget-title]') : null;
  const priceInput = modal ? modal.querySelector('[data-widget-price]') : null;
  const freeToggle = modal ? modal.querySelector('[data-widget-free]') : null;
  const saveBtn = modal ? modal.querySelector('[data-save-widget]') : null;
  const cancelBtn = modal ? modal.querySelector('[data-cancel-widget]') : null;
  const initialArea = modal ? modal.querySelector('[data-initial-area]') : null;
  const listContainer = document.querySelector('[data-widgets-list]');

  let lastPreviewPayload = null;

  if (!logoutButton) {
    // still continue for app widgets UI
  }

  logoutButton.addEventListener('click', async (event) => {
    event.preventDefault();

    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        throw new Error(`Falha ao encerrar a sessão (${response.status})`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      window.location.href = '/';
    }
  });

  // ----- Add widget modal logic -----
  function openModal() {
    if (modalToggle) modalToggle.checked = true;
  }
  function closeModal() {
    if (modalToggle) modalToggle.checked = false;
    if (previewBlock) previewBlock.hidden = true;
    if (initialArea) initialArea.hidden = false;
    if (previewContainer) previewContainer.innerHTML = '';
    if (form) form.reset();
    if (saveBtn) saveBtn.disabled = true;
    lastPreviewPayload = null;
  }

  if (openAddBtn) {
    openAddBtn.addEventListener('click', openModal);
  }
  if (closeModalEls) {
    closeModalEls.forEach((el) => el.addEventListener('click', closeModal));
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  // fechar com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalToggle && modalToggle.checked) {
      closeModal();
    }
  });

  // fechar clicando fora
  if (modal) {
    const overlay = modal.querySelector('.modal-overlay');
    if (overlay) overlay.addEventListener('click', closeModal);
  }

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      if (!fileInput.files || fileInput.files.length === 0) return;
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const resp = await fetch('/api/widgets/preview', {
          method: 'POST',
          body: formData,
        });
        if (!resp.ok) throw new Error('Falha no preview');
        const data = await resp.json();
        lastPreviewPayload = data;
        if (previewContainer) previewContainer.innerHTML = data.html || '';
        if (titleInput) titleInput.value = '';
        if (previewBlock) previewBlock.hidden = false;
        if (initialArea) initialArea.hidden = true;
        if (saveBtn) saveBtn.disabled = false;
        if (freeToggle && priceInput) {
          freeToggle.checked = true;
          priceInput.disabled = true;
          priceInput.value = '';
        }
      } catch (err) {
        console.error(err);
        alert('Não foi possível processar o widget.');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!lastPreviewPayload) return;
      const payload = {
        sourceId: lastPreviewPayload.sourceId,
        name: lastPreviewPayload.name,
        view: lastPreviewPayload.view,
        defaultState: lastPreviewPayload.defaultState,
        states: lastPreviewPayload.states,
        title: (titleInput && titleInput.value) || '',
        priceUsd: priceInput && priceInput.value ? parseCurrency(priceInput.value) : 0,
      };
      // validações obrigatórias
      if (!payload.title.trim()) {
        alert('Title is required.');
        return;
      }
      if (freeToggle && !freeToggle.checked) {
        if (!priceInput || !priceInput.value.trim()) {
          alert('Price is required unless Free is enabled.');
          return;
        }
      }
      try {
        const resp = await fetch('/api/widgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error('Falha ao salvar');
        const created = await resp.json();
        appendWidgetCard(created, lastPreviewPayload.html);
        closeModal();
      } catch (err) {
        console.error(err);
        alert('Não foi possível salvar o widget.');
      }
    });
  }

  function appendWidgetCard(widget, html) {
    if (!listContainer) return;
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-thumb">
        <div class="product-preview">
          <div class="product-preview-canvas">${html || ''}</div>
        </div>
      </div>
      <div class="product-body">
        <h3>${escapeHtml(widget.title || widget.name)}</h3>
        <div class="product-price">${widget.priceCents ? formatUSD((widget.priceCents || 0)/100) : 'Free'}</div>
        <p>${escapeHtml(widget.name)}</p>
      </div>
    `;
    listContainer.prepend(card);
  }

  // máscara de moeda USD
  function parseCurrency(text) {
    const cleaned = String(text).replace(/[^0-9.]/g, '');
    const value = Number(cleaned || '0');
    return isFinite(value) ? value : 0;
  }

  function formatUSD(value) {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
    } catch (_) {
      return `$${(value || 0).toFixed(2)}`;
    }
  }

  if (priceInput) {
    priceInput.addEventListener('focus', () => {
      const num = parseCurrency(priceInput.value);
      priceInput.value = num ? String(num) : '';
    });
    priceInput.addEventListener('blur', () => {
      const num = parseCurrency(priceInput.value);
      priceInput.value = num ? formatUSD(num) : '';
    });
    priceInput.addEventListener('input', () => {
      const caret = priceInput.selectionStart;
      const cleaned = priceInput.value.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      const safe = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
      priceInput.value = safe;
      try { priceInput.setSelectionRange(caret, caret); } catch (_) {}
    });
  }

  if (freeToggle && priceInput) {
    freeToggle.addEventListener('change', () => {
      const isFree = freeToggle.checked;
      priceInput.disabled = isFree;
      if (isFree) priceInput.value = '';
    });
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // carregar existentes na entrada
  async function loadExisting() {
    try {
      if (!listContainer) return;
      const resp = await fetch('/api/widgets');
      if (!resp.ok) return;
      const items = await resp.json();
      for (const w of items) {
        // render simples: reusa título/preço e deixa sem preview até usuário abrir novamente
        appendWidgetCard(w, '');
      }
    } catch (err) {
      console.error(err);
    }
  }
  loadExisting();
});
