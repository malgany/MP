const { Router } = require('express');
const { prisma } = require('../db/prisma');
const { stripe } = require('../stripe');
const { ensureAuthenticated } = require('../middleware/auth');

const router = Router();

function baseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

router.post('/accounts', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.stripeAccountId) {
      return res.json({ accountId: user.stripeAccountId });
    }

    const country = process.env.STRIPE_ACCOUNT_COUNTRY || 'US';
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      email: user.email || undefined,
      business_type: 'individual',
    });

    await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId: account.id },
    });

    return res.status(201).json({ accountId: account.id });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[connect/accounts] error', err);
    return res.status(400).json({ message: 'Falha ao criar conta Stripe', detail: String(err?.message || err) });
  }
});

router.post('/onboarding-link', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.stripeAccountId) return res.status(400).json({ message: 'Conta Stripe não encontrada' });

    const origin = baseUrl(req);
    const refreshUrl = `${origin}/app?connect=reauth`;
    const returnUrl = `${origin}/app?connect=return`;

    const link = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return res.json({ url: link.url });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[connect/onboarding-link] error', err);
    return res.status(400).json({ message: 'Falha ao gerar link de onboarding', detail: String(err?.message || err) });
  }
});

router.get('/account', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.stripeAccountId) return res.status(404).json({ message: 'Conta Stripe não vinculada' });
    const acc = await stripe.accounts.retrieve(user.stripeAccountId);
    const chargesEnabled = Boolean(acc.charges_enabled);
    const payoutsEnabled = Boolean(acc.payouts_enabled);
    const requirementsDue = acc.requirements?.currently_due || [];

    await prisma.user.update({
      where: { id: userId },
      data: {
        chargesEnabled,
        payoutsEnabled,
        requirementsDue,
      },
    });

    return res.json({
      accountId: acc.id,
      chargesEnabled,
      payoutsEnabled,
      requirementsDue,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[connect/account] error', err);
    return res.status(400).json({ message: 'Falha ao consultar conta', detail: String(err?.message || err) });
  }
});

router.post('/login-link', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.stripeAccountId) return res.status(404).json({ message: 'Conta Stripe não vinculada' });
    const link = await stripe.accounts.createLoginLink(user.stripeAccountId);
    return res.json({ url: link.url });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[connect/login-link] error', err);
    return res.status(400).json({ message: 'Falha ao gerar login link', detail: String(err?.message || err) });
  }
});

router.get('/summary', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const agg = await prisma.order.aggregate({
      where: { sellerUserId: userId, status: 'paid' },
      _sum: { amountCents: true },
      _count: { _all: true },
    });
    return res.json({
      chargesEnabled: Boolean(user?.chargesEnabled),
      payoutsEnabled: Boolean(user?.payoutsEnabled),
      ordersCount: agg._count?._all || 0,
      grossCents: agg._sum?.amountCents || 0,
      currency: 'mixed',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[connect/summary] error', err);
    return res.status(400).json({ message: 'Falha ao obter resumo' });
  }
});

module.exports = router;


