const { prisma } = require('../db/prisma');

async function createWidget(params) {
  const {
    userId,
    sourceId,
    name,
    title,
    priceCents,
    view,
    defaultState,
    states,
    rawBase64,
    fileName,
    fileExt,
  } = params;

  return prisma.widget.create({
    data: {
      userId,
      sourceId,
      name,
      title,
      priceCents,
      view,
      defaultState,
      states,
      raw: rawBase64 || null,
      fileName: fileName || null,
      fileExt: fileExt || null,
    },
  });
}

async function listWidgetsByUserId(userId) {
  return prisma.widget.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

async function deleteWidgetByIdForUser(id, userId) {
  return prisma.widget.deleteMany({
    where: { id, userId },
  });
}

async function getWidgetById(id) {
  return prisma.widget.findUnique({ where: { id } });
}

// Listagem pública com paginação por createdAt (keyset) e filtro por preço
async function listWidgetsPublic(params = {}) {
  const { limit = 12, beforeCreatedAt, priceFilter = 'all' } = params;

  const where = {};
  if (beforeCreatedAt) {
    where.createdAt = { lt: new Date(beforeCreatedAt) };
  }
  if (priceFilter === 'free') {
    where.priceCents = 0;
  } else if (priceFilter === 'premium') {
    where.priceCents = { gt: 0 };
  }

  return prisma.widget.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(100, Number(limit) || 12)),
    select: {
      id: true,
      title: true,
      name: true,
      priceCents: true,
      view: true,
      defaultState: true,
      createdAt: true,
    },
  });
}

module.exports = {
  createWidget,
  listWidgetsByUserId,
  deleteWidgetByIdForUser,
  listWidgetsPublic,
  getWidgetById,
};


