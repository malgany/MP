const { Router } = require('express');
const multer = require('multer');
const { renderWidgetToHtml } = require('../../lib');
const { createWidget, listWidgetsByUserId, deleteWidgetByIdForUser, getWidgetById } = require('../repositories/widgetRepository');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
});

const router = Router();
function buildDownloadFileName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `widget_${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}.widget`;
}
async function renderPreviewWithRetries(view, defaultState) {
  const delays = [20, 100, 250];
  for (const delay of delays) {
    try {
      const html = await renderWidgetToHtml(view, defaultState, { flushDelay: delay });
      if (html && String(html).trim().length > 0) {
        return { html, usedDelay: delay };
      }
    } catch (err) {
      // tenta novamente com próximo delay
    }
  }
  return { html: '', usedDelay: delays[delays.length - 1] };
}

router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo .widget é obrigatório' });
    }
    if (!req.file.originalname.toLowerCase().endsWith('.widget')) {
      return res.status(400).json({ message: 'Apenas arquivos .widget são aceitos' });
    }

    const root = JSON.parse(req.file.buffer.toString('utf8'));
    const enc = root.encodedWidget || root.encodedwidget || root.encodeWidget || root.encoded;
    if (!enc || typeof enc !== 'string') {
      return res.status(400).json({ message: 'Campo encodedWidget ausente' });
    }
    const decodedStr = Buffer.from(enc, 'base64').toString('utf8');
    const payload = JSON.parse(decodedStr);
    const { id: sourceId, name, view, defaultState, states } = payload;

    if (!view || !defaultState) {
      return res.status(400).json({ message: 'Widget inválido: view/defaultState ausentes' });
    }

    const html = await renderWidgetToHtml(view, defaultState, { flushDelay: 20 });
    const fileName = req.file.originalname;
    const fileExt = (fileName.split('.').pop() || '').toLowerCase();
    const rawBase64 = Buffer.from(req.file.buffer).toString('base64');
    return res.json({ sourceId, name, view, defaultState, states: states || [], html, rawBase64, fileName, fileExt });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[widgets/preview] erro:', error);
    return res.status(400).json({ message: 'Falha ao processar o widget', detail: String(error?.message || error) });
  }
});

router.post('/', async (req, res) => {
  try {
    const { sourceId, name, view, defaultState, states, title, priceUsd, rawBase64, fileName, fileExt } = req.body || {};
    if (!sourceId || !name || !view || !defaultState) {
      return res.status(400).json({ message: 'Campos obrigatórios ausentes' });
    }
    const safeTitle = String(title ?? name).slice(0, 150);
    const priceCents = Math.max(0, Math.round((Number(priceUsd) || 0) * 100));

    const created = await createWidget({
      userId: req.user.id,
      sourceId,
      name,
      title: safeTitle,
      priceCents,
      view,
      defaultState,
      states: states ?? [],
      rawBase64: typeof rawBase64 === 'string' && rawBase64.length > 0 ? rawBase64 : null,
      fileName: fileName ? String(fileName).slice(0, 255) : null,
      fileExt: fileExt ? String(fileExt).slice(0, 20) : null,
    });

    return res.status(201).json(created);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[widgets/create] erro:', error);
    return res.status(400).json({ message: 'Falha ao salvar widget', detail: String(error?.message || error) });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await listWidgetsByUserId(req.user.id);
    // Gera um HTML de preview para cada widget usando a view e o estado padrão
    const enriched = await Promise.all(
      list.map(async (item) => {
        try {
          const { html: previewHtml } = await renderPreviewWithRetries(item.view, item.defaultState);
          return { ...item, previewHtml };
        } catch (_e) {
          return { ...item, previewHtml: '' };
        }
      })
    );
    res.set('Cache-Control', 'no-store');
    return res.json(enriched);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[widgets/list] erro:', error);
    return res.status(400).json({ message: 'Falha ao listar widgets' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'ID ausente' });
    const result = await deleteWidgetByIdForUser(id, req.user.id);
    if (!result || !result.count) return res.status(404).json({ message: 'Not found' });
    return res.status(204).end();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[widgets/delete] erro:', error);
    return res.status(400).json({ message: 'Falha ao excluir widget' });
  }
});

// Download widget (.widget)
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'ID ausente' });
    const widget = await getWidgetById(id);
    if (!widget) return res.status(404).json({ message: 'Not found' });

    const isOwner = widget.userId === req.user.id;
    const isFree = Number(widget.priceCents || 0) === 0;
    if (!isOwner && !isFree) {
      // verifica se o usuário comprou
      const { prisma } = require('../db/prisma');
      const paid = await prisma.order.findFirst({ where: { widgetId: id, buyerUserId: req.user.id, status: 'paid' } });
      if (!paid) return res.status(403).json({ message: 'Acesso negado' });
    }

    let fileBuffer;
    const fileName = buildDownloadFileName();
    if (widget.raw && typeof widget.raw === 'string') {
      fileBuffer = Buffer.from(widget.raw, 'base64');
    } else {
      // fallback: reconstruir
      const encoded = Buffer.from(JSON.stringify({
        id: widget.sourceId,
        name: widget.name,
        view: widget.view,
        defaultState: widget.defaultState,
        states: widget.states,
      }), 'utf8').toString('base64');
      const root = { encodedWidget: encoded };
      fileBuffer = Buffer.from(JSON.stringify(root), 'utf8');
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(fileBuffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[widgets/download] erro:', error);
    return res.status(400).json({ message: 'Falha ao baixar widget' });
  }
});

module.exports = router;


