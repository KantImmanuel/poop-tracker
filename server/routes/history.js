const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function encodeCursor(timestamp, id) {
  return Buffer.from(JSON.stringify({ ts: timestamp.toISOString(), id })).toString('base64url');
}

function decodeCursor(cursor) {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    return { ts: new Date(parsed.ts), id: parsed.id };
  } catch {
    return null;
  }
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const cursor = req.query.cursor ? decodeCursor(req.query.cursor) : null;
    const { date } = req.query;

    // Date filter mode: return all entries for that day, no pagination
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const dateWhere = {
        userId: req.user.userId,
        timestamp: { gte: startOfDay, lte: endOfDay }
      };

      const [meals, poops] = await Promise.all([
        req.prisma.meal.findMany({
          where: dateWhere,
          include: { foods: true },
          orderBy: { timestamp: 'desc' }
        }),
        req.prisma.poopLog.findMany({
          where: dateWhere,
          orderBy: { timestamp: 'desc' }
        })
      ]);

      const items = [
        ...meals.map(m => ({ ...m, type: 'meal' })),
        ...poops.map(p => ({ ...p, type: 'poop' }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return res.json({ items, nextCursor: null, hasMore: false });
    }

    // Cursor-paginated mode
    const baseWhere = { userId: req.user.userId };
    let cursorWhere = {};

    if (cursor) {
      cursorWhere = {
        OR: [
          { timestamp: { lt: cursor.ts } },
          { timestamp: cursor.ts, id: { lt: cursor.id } }
        ]
      };
    }

    const fetchCount = limit + 1;

    const [meals, poops] = await Promise.all([
      req.prisma.meal.findMany({
        where: { ...baseWhere, ...cursorWhere },
        include: { foods: true },
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        take: fetchCount
      }),
      req.prisma.poopLog.findMany({
        where: { ...baseWhere, ...cursorWhere },
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        take: fetchCount
      })
    ]);

    const combined = [
      ...meals.map(m => ({ ...m, type: 'meal' })),
      ...poops.map(p => ({ ...p, type: 'poop' }))
    ].sort((a, b) => {
      const diff = new Date(b.timestamp) - new Date(a.timestamp);
      if (diff !== 0) return diff;
      return b.id > a.id ? 1 : -1;
    });

    const pageItems = combined.slice(0, limit);
    const hasMore = combined.length > limit;

    let nextCursor = null;
    if (hasMore && pageItems.length > 0) {
      const lastItem = pageItems[pageItems.length - 1];
      nextCursor = encodeCursor(new Date(lastItem.timestamp), lastItem.id);
    }

    res.json({ items: pageItems, nextCursor, hasMore });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to fetch history');
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

module.exports = router;
