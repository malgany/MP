const { Router } = require('express');
const { stripe } = require('../stripe');
const { prisma } = require('../db/prisma');

const router = Router();

function baseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

router.post('/session', async (req, res) => {
  try {
    const { widgetId } = req.body || {};
    if (!widgetId) return res.status(400).json({ message: 'widgetId é obrigatório' });

    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
      include: { user: true },
    });
    if (!widget) return res.status(404).json({ message: 'Widget não encontrado' });
    if (Number(widget.priceCents || 0) <= 0) return res.status(400).json({ message: 'Widget gratuito não requer checkout' });

    const seller = widget.user;
    if (!seller || !seller.stripeAccountId) {
      return res.status(400).json({ message: 'Vendedor não conectado ao Stripe' });
    }
    if (!seller.chargesEnabled) {
      return res.status(400).json({ message: 'Conta do vendedor não pode aceitar pagamentos ainda' });
    }

    const priceCents = Number(widget.priceCents);
    const currency = (widget.currency || 'usd').toLowerCase();
    const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS || '1000'); // 10% padrão
    const applicationFee = Math.max(0, Math.floor((priceCents * platformFeeBps) / 10000));
    const destination = seller.stripeAccountId;

    const origin = baseUrl(req);
    const successUrl = `${origin}/?purchase=success&widget=${encodeURIComponent(widget.id)}`;
    const cancelUrl = `${origin}/?purchase=cancel&widget=${encodeURIComponent(widget.id)}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: widget.title || widget.name },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: { destination },
        on_behalf_of: destination,
        transfer_group: `widget_${widget.id}`,
        metadata: {
          widgetId: widget.id,
          sellerId: seller.id,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        widgetId: widget.id,
        sellerId: seller.id,
      },
    });

    // cria registro de pedido pendente
    await prisma.order.create({
      data: {
        widgetId: widget.id,
        buyerUserId: req.user?.id || 'anonymous',
        sellerUserId: seller.id,
        amountCents: priceCents,
        currency,
        stripeSessionId: session.id,
        status: 'pending',
      },
    }).catch(() => {});

    return res.status(201).json({ url: session.url, id: session.id });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[checkout/session] error', err);
    return res.status(400).json({ message: 'Falha ao criar sessão de checkout', detail: String(err?.message || err) });
  }
});

module.exports = router;


