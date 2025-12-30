const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notification.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/vapid-public-key', notificationController.getVapidPublicKey);
router.post('/subscribe', verifyToken, notificationController.subscribeToPushNotifications);
router.post('/unsubscribe', verifyToken, notificationController.unsubscribeFromPushNotifications);
router.get('/', verifyToken, notificationController.getNotifications);
router.get('/unread-count', verifyToken, notificationController.getUnreadCount);
router.put('/:notification_id/read', verifyToken, notificationController.markNotificationAsRead);
router.put('/read-all', verifyToken, notificationController.markAllNotificationsAsRead);
router.delete('/:notification_id', verifyToken, notificationController.deleteNotification);
router.post('/send-test', verifyToken, notificationController.sendTestNotification);

module.exports = router;
