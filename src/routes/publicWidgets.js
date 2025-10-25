const { Router } = require('express');
const { renderWidgetToHtml } = require('../../lib');
const { listWidgetsPublic } = require('../repositories/widgetRepository');

const router = Router();

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

router.get('/', async (req, res) => {
  try {
    const price = String(req.query.price || 'all');
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 12));
    const before = req.query.before ? new Date(String(req.query.before)) : null;

    const items = await listWidgetsPublic({
      limit,
      beforeCreatedAt: before || undefined,
      priceFilter: price === 'free' || price === 'premium' ? price : 'all',
    });

    const enriched = await Promise.all(
      items.map(async (item) => {
        try {
          const { html: previewHtml } = await renderPreviewWithRetries(item.view, item.defaultState);
          return { id: item.id, title: item.title, name: item.name, priceCents: item.priceCents, createdAt: item.createdAt, previewHtml };
        } catch (_e) {
          return { id: item.id, title: item.title, name: item.name, priceCents: item.priceCents, createdAt: item.createdAt, previewHtml: '' };
        }
      })
    );

    const last = items[items.length - 1] || null;
    const nextCursor = last ? last.createdAt.toISOString() : null;
    const hasMore = Boolean(last);

    res.set('Cache-Control', 'no-store');
    return res.json({ items: enriched, nextCursor, hasMore });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[publicWidgets/list] erro:', error);
    return res.status(400).json({ message: 'Falha ao listar widgets públicos' });
  }
});

module.exports = router;


