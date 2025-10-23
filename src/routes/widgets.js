const { Router } = require('express');
const multer = require('multer');
const { renderWidgetToHtml } = require('../../lib');
const { createWidget, listWidgetsByUserId } = require('../repositories/widgetRepository');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
});

const router = Router();

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
    return res.json({ sourceId, name, view, defaultState, states: states || [], html });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[widgets/preview] erro:', error);
    return res.status(400).json({ message: 'Falha ao processar o widget', detail: String(error?.message || error) });
  }
});

router.post('/', async (req, res) => {
  try {
    const { sourceId, name, view, defaultState, states, title, priceUsd } = req.body || {};
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
    return res.json(list);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[widgets/list] erro:', error);
    return res.status(400).json({ message: 'Falha ao listar widgets' });
  }
});

module.exports = router;


