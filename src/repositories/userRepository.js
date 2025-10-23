const { prisma } = require('../db/prisma');

function normalizeProfile(profile) {
  const primaryEmail = Array.isArray(profile.emails) && profile.emails[0] ? profile.emails[0].value : null;
  const primaryPhoto = Array.isArray(profile.photos) && profile.photos[0] ? profile.photos[0].value : null;

  return {
    googleId: profile.id,
    displayName: profile.displayName,
    email: primaryEmail,
    photo: primaryPhoto,
  };
}

async function findById(id) {
  return prisma.user.findUnique({
    where: { id },
  });
}

async function findByGoogleId(googleId) {
  return prisma.user.findUnique({
    where: { googleId },
  });
}

async function upsertFromGoogle(profile, tokens = {}) {
  const data = normalizeProfile(profile);
  const provider = 'google';

  const accountPayload = {
    provider,
    providerAccountId: data.googleId,
    accessToken: tokens.accessToken || null,
    refreshToken: tokens.refreshToken || null,
    tokenExpiresAt: tokens.tokenExpiresAt || null,
  };

  const user = await prisma.user.upsert({
    where: { googleId: data.googleId },
    create: {
      ...data,
      accounts: {
        create: accountPayload,
      },
    },
    update: {
      ...data,
      accounts: {
        upsert: {
          where: {
            provider_providerAccountId: {
              provider,
              providerAccountId: data.googleId,
            },
          },
          update: accountPayload,
          create: accountPayload,
        },
      },
    },
  });

  return user;
}

module.exports = {
  findById,
  findByGoogleId,
  upsertFromGoogle,
};
