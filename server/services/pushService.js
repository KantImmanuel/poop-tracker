const webpush = require('web-push');
const logger = require('./logger');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@gutfeeling.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send a push notification to a single subscription.
 * Returns true if sent, false if the subscription is stale (410/404).
 */
async function sendPushNotification(subscription, payload) {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      logger.info({ endpoint: subscription.endpoint }, 'Push subscription expired');
      return false;
    }
    logger.error({ err: error, endpoint: subscription.endpoint }, 'Failed to send push notification');
    return false;
  }
}

module.exports = { sendPushNotification };
