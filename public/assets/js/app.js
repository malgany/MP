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
  const formAlert = modal ? modal.querySelector('[data-form-alert]') : null;
  const titleError = modal ? modal.querySelector('[data-title-error]') : null;
  const priceError = modal ? modal.querySelector('[data-price-error]') : null;
  const listContainer = document.querySelector('[data-widgets-list]');

  let lastPreviewPayload = null;

  if (logoutButton) {
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
  }

  // ----- Add widget modal logic -----
  function openModal() {
    if (modalToggle) modalToggle.checked = true;
    if (modal) modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    if (modalToggle) modalToggle.checked = false;
    if (modal) modal.setAttribute('aria-hidden', 'true');
    if (previewBlock) previewBlock.hidden = true;
    if (initialArea) initialArea.hidden = false;
    if (previewContainer) previewContainer.innerHTML = '';
    if (form) form.reset();
    if (saveBtn) saveBtn.disabled = true;
    clearErrors();
    lastPreviewPayload = null;
  }

  if (openAddBtn) {
    openAddBtn.addEventListener('click', openModal);
  }
  if (closeModalEls) {
    closeModalEls.forEach((el) => el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    }));
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
    if (overlay) overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
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
        showAlert('Could not process the widget file.');
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
      clearErrors();
      let hasError = false;
      if (!payload.title.trim()) {
        setFieldError(titleInput, titleError, 'Title is required.');
        hasError = true;
      }
      if (freeToggle && !freeToggle.checked) {
        const priceText = (priceInput && priceInput.value) ? String(priceInput.value).trim() : '';
        if (!priceText) {
          setFieldError(priceInput, priceError, 'Price is required unless Free is enabled.');
          hasError = true;
        } else if (!isFinite(parseCurrency(priceText))) {
          setFieldError(priceInput, priceError, 'Enter a valid USD amount.');
          hasError = true;
        }
      }
      if (hasError) {
        showAlert('Please fix the highlighted fields and try again.');
        return;
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
        showAlert('Could not save the widget. Please try again.');
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
          <div class="product-preview-canvas"></div>
        </div>
      </div>
      <div class="product-body">
        <h3>${escapeHtml(widget.title || widget.name)}</h3>
        <div class="product-price">${widget.priceCents ? formatUSD((widget.priceCents || 0)/100) : 'Free'}</div>
        <p>${escapeHtml(widget.name)}</p>
      </div>
    `;
    const canvas = card.querySelector('.product-preview-canvas');
    const htmlToUse = html != null ? html : (widget && widget.previewHtml) || '';
    if (canvas && htmlToUse) {
      const frame = document.createElement('iframe');
      frame.setAttribute('loading', 'lazy');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.border = '0';
      frame.srcdoc = buildPreviewSrcdoc(String(htmlToUse));
      canvas.appendChild(frame);
    }
    listContainer.prepend(card);
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

  // máscara de moeda USD
  function parseCurrency(text) {
    const cleaned = String(text).replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const intPart = parts[0] || '0';
    const fracPart = (parts[1] || '').slice(0, 2); // até 2 casas decimais
    const normalized = fracPart ? `${intPart}.${fracPart}` : intPart;
    const value = Number(normalized || '0');
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
      const merged = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
      const [iPart, fPartRaw = ''] = merged.split('.');
      const fPart = fPartRaw.slice(0, 2); // limita a 2 casas
      priceInput.value = fPart ? `${iPart}.${fPart}` : iPart;
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

  function setFieldError(inputEl, errorEl, message) {
    if (inputEl) inputEl.classList.add('input-invalid');
    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.hidden = false;
    }
  }

  function clearErrors() {
    if (formAlert) formAlert.hidden = true;
    if (titleInput) titleInput.classList.remove('input-invalid');
    if (priceInput) priceInput.classList.remove('input-invalid');
    if (titleError) { titleError.textContent = ''; titleError.hidden = true; }
    if (priceError) { priceError.textContent = ''; priceError.hidden = true; }
  }

  function showAlert(message) {
    if (!formAlert) return;
    formAlert.textContent = String(message || 'An error occurred.');
    formAlert.hidden = false;
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
      const resp = await fetch('/api/widgets', { cache: 'no-store' });
      if (!resp.ok) return;
      const items = await resp.json();
      for (const w of items) {
        appendWidgetCard(w, null);
      }
    } catch (err) {
      console.error(err);
    }
  }
  loadExisting();
});
