const { Router } = require('express');
const { stripe } = require('../stripe');
const { prisma } = require('../db/prisma');

const router = Router();

router.post('/stripe',
  // raw body for Stripe signature verification
  require('express').raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    let event;
    try {
      if (!webhookSecret) {
        // In dev, allow unverified if secret missing (not recommended in prod)
        event = req.body ? JSON.parse(req.body.toString()) : req.body;
      } else {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[webhooks] signature error', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const widgetId = session.metadata?.widgetId;
          const sellerId = session.metadata?.sellerId;
          const paymentIntentId = session.payment_intent || null;

          try {
            await prisma.order.update({
              where: { stripeSessionId: session.id },
              data: { status: 'paid', paymentIntentId },
            });
          } catch (_e) {
            // cria se não existir
            const amountTotal = session.amount_total || session.amount_subtotal || 0;
            await prisma.order.create({
              data: {
                widgetId: widgetId || 'unknown',
                buyerUserId: 'unknown',
                sellerUserId: sellerId || 'unknown',
                amountCents: Number(amountTotal || 0),
                currency: session.currency || 'usd',
                stripeSessionId: session.id,
                paymentIntentId,
                status: 'paid',
              },
            }).catch(() => {});
          }

          break;
        }
        case 'payment_intent.succeeded': {
          const pi = event.data.object;
          // eslint-disable-next-line no-console
          console.log('[webhook] payment_intent.succeeded', { id: pi.id });
          break;
        }
        case 'payment_intent.payment_failed': {
          const pi = event.data.object;
          // eslint-disable-next-line no-console
          console.log('[webhook] payment_intent.payment_failed', { id: pi.id });
          break;
        }
        case 'account.updated':
        case 'capability.updated': {
          const acc = event.data.object;
          const user = await prisma.user.findFirst({ where: { stripeAccountId: acc.id } });
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                chargesEnabled: Boolean(acc.charges_enabled),
                payoutsEnabled: Boolean(acc.payouts_enabled),
                requirementsDue: acc.requirements?.currently_due || [],
              },
            });
          }
          break;
        }
        default:
          // eslint-disable-next-line no-console
          console.log(`[webhook] evento não tratado: ${event.type}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[webhooks] handler error', err);
      return res.status(500).end();
    }

    return res.json({ received: true });
  }
);

module.exports = router;


