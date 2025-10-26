const Stripe = require('stripe');

const apiKey = process.env.STRIPE_SECRET_KEY || '';

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn('[stripe] STRIPE_SECRET_KEY ausente nas variáveis de ambiente');
}

const stripe = new Stripe(apiKey, {
  apiVersion: '2024-06-20',
});

module.exports = { stripe };


