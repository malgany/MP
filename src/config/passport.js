const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { upsertFromGoogle, findById } = require('../repositories/userRepository');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error(
    'Google OAuth credentials are missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.'
  );
}

const defaultBase = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3000';
const baseUrl = (process.env.BASE_URL || defaultBase).replace(/\/$/, '');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await findById(id);
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: clientId,
      clientSecret,
      callbackURL: `${baseUrl}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await upsertFromGoogle(profile, {
          accessToken,
          refreshToken,
        });
        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

module.exports = passport;
