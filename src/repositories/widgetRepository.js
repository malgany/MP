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
    },
  });
}

async function listWidgetsByUserId(userId) {
  return prisma.widget.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = {
  createWidget,
  listWidgetsByUserId,
};


