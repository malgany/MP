const { Router } = require('express');
const passport = require('passport');

const router = Router();

router.get('/status', (req, res) => {
  const isAuthenticated = Boolean(req.user);
  res.json({ authenticated: isAuthenticated, user: isAuthenticated ? { id: req.user.id, displayName: req.user.displayName } : null });
});

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/',
    successReturnToOrRedirect: '/app',
  })
);

router.post('/logout', (req, res, next) => {
  if (!req.user) {
    return res.status(204).end();
  }

  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        return next(destroyErr);
      }
      res.clearCookie('connect.sid', { path: '/' });
      return res.status(204).end();
    });
  });
});

module.exports = router;
