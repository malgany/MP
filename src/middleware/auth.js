function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  if (req.accepts('html')) {
    return res.redirect('/');
  }

  return res.status(401).json({ message: 'Authentication required' });
}

function exposeUser(req, res, next) {
  res.locals.user = req.user || null;
  next();
}

module.exports = {
  ensureAuthenticated,
  exposeUser,
};
