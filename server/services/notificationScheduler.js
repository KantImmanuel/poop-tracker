const cron = require('node-cron');
const logger = require('./logger');
const { sendPushNotification } = require('./pushService');

const MEAL_REMINDERS = [
  { title: 'Time to eat?', body: 'Snap a photo of your meal to track it.' },
  { title: 'Meal time!', body: "Don't forget to log what you're eating." },
  { title: 'Hungry?', body: 'Log your meal while it\'s fresh in your mind.' },
];

const DAILY_NUDGE = [
  { title: "How's your gut today?", body: "You haven't logged anything yet. Quick check-in?" },
  { title: "Don't forget to log!", body: 'Consistent tracking helps spot patterns.' },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function startScheduler(prisma) {
  // Meal reminder: 5pm UTC (9am Pacific / 12pm Eastern / 5pm London)
  cron.schedule('0 17 * * *', async () => {
    logger.info('Running meal reminder notification');
    await sendToAllSubscribers(prisma, pickRandom(MEAL_REMINDERS), '/log-meal', 'meal-reminder');
  });

  // "Haven't logged today" nudge: 9pm UTC (1pm Pacific / 4pm Eastern)
  cron.schedule('0 21 * * *', async () => {
    logger.info('Running daily nudge notifications');
    await sendNudgeToInactiveUsers(prisma);
  });

  logger.info('Notification scheduler started');
}

async function sendToAllSubscribers(prisma, message, url, tag) {
  const subscriptions = await prisma.pushSubscription.findMany();
  const staleIds = [];

  for (const sub of subscriptions) {
    const success = await sendPushNotification(sub, {
      title: message.title,
      body: message.body,
      url,
      tag,
    });
    if (!success) {
      staleIds.push(sub.id);
    }
  }

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
    logger.info({ count: staleIds.length }, 'Deleted stale push subscriptions');
  }
}

async function sendNudgeToInactiveUsers(prisma) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usersWithSubs = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    include: {
      pushSubscriptions: true,
      meals: { where: { timestamp: { gte: today } }, take: 1 },
      poopLogs: { where: { timestamp: { gte: today } }, take: 1 },
    },
  });

  const staleIds = [];

  for (const user of usersWithSubs) {
    if (user.meals.length > 0 || user.poopLogs.length > 0) continue;

    const message = pickRandom(DAILY_NUDGE);
    for (const sub of user.pushSubscriptions) {
      const success = await sendPushNotification(sub, {
        title: message.title,
        body: message.body,
        url: '/',
        tag: 'daily-nudge',
      });
      if (!success) staleIds.push(sub.id);
    }
  }

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
    logger.info({ count: staleIds.length }, 'Deleted stale push subscriptions');
  }
}

module.exports = { startScheduler };
