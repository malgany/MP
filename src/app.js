const express = require('express');
const path = require('path');
const session = require('express-session');
const morgan = require('morgan');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const widgetRoutes = require('./routes/widgets');
const publicWidgetsRoutes = require('./routes/publicWidgets');
const { ensureAuthenticated, exposeUser } = require('./middleware/auth');

const app = express();

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  console.warn('SESSION_SECRET is not defined. Set it in your environment to secure sessions.');
}

const cookieSecure = process.env.NODE_ENV === 'production';

if (cookieSecure) {
  app.set('trust proxy', 1);
}

app.use(
  session({
    secret: sessionSecret || 'replace-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(exposeUser);

const publicDir = path.join(__dirname, '..', 'public');
const libDir = path.join(__dirname, '..', 'lib');

app.use('/assets', express.static(path.join(publicDir, 'assets')));
app.use('/lib', express.static(libDir));

app.use('/auth', authRoutes);
app.use('/api/public/widgets', publicWidgetsRoutes);
app.use('/api/widgets', ensureAuthenticated, widgetRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/app', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(publicDir, 'app.html'));
});

app.get('/reference', (req, res) => {
  res.redirect('/app');
});

['/dashboard', '/produtos', '/form'].forEach((route) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
});

app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(publicDir, 'index.html'));
  }

  return res.status(404).json({ message: 'Not found' });
});

module.exports = app;
