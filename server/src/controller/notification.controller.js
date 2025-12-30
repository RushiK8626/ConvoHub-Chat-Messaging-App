const { PrismaClient } = require('@prisma/client');
const notificationService = require('../services/notification.service');

const prisma = new PrismaClient();

exports.subscribeToPushNotifications = async (req, res) => {
  try {
    const user_id = req.user?.user_id;
    const { subscription } = req.body;

    if (!user_id || !subscription) return res.status(400).json({ error: 'user_id and subscription are required' });
    if (!subscription.endpoint || !subscription.keys) return res.status(400).json({ error: 'Invalid subscription format' });

    const savedSubscription = await notificationService.savePushSubscription(user_id, subscription);

    res.status(201).json({ message: 'Successfully subscribed to push notifications', data: { user_id, subscribed_at: savedSubscription.created_at } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to subscribe to notifications' });
  }
};

exports.unsubscribeFromPushNotifications = async (req, res) => {
  try {
    const user_id = req.user?.user_id;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const result = await notificationService.removePushSubscription(user_id);
    if (!result) return res.status(404).json({ error: 'Push subscription not found' });

    res.status(200).json({ message: 'Successfully unsubscribed from push notifications' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unsubscribe from notifications' });
  }
};

exports.getVapidPublicKey = async (req, res) => {
  try {
    const publicKey = notificationService.getVapidPublicKey();
    if (!publicKey) return res.status(500).json({ error: 'VAPID public key not configured' });

    res.set({ 'Cache-Control': 'public, max-age=86400', 'Content-Type': 'application/json' });
    res.status(200).json({ vapidPublicKey: publicKey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve VAPID key' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const user_id = req.user?.user_id;
    const { limit = 20, offset = 0 } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const notifications = await prisma.notification.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      select: { notification_id: true, message: true, notification_type: true, action_url: true, is_read: true, read_at: true, created_at: true }
    });

    const total = await prisma.notification.count({ where: { user_id } });

    res.status(200).json({
      data: notifications,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset), hasMore: (parseInt(offset) + parseInt(limit)) < total }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notification_id } = req.params;
    const user_id = req.user?.user_id;
    if (!notification_id || !user_id) return res.status(400).json({ error: 'notification_id and user_id are required' });

    const notification = await prisma.notification.findUnique({ where: { notification_id: parseInt(notification_id) } });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.user_id !== user_id) return res.status(403).json({ error: 'Not authorized to update this notification' });

    const updated = await prisma.notification.update({
      where: { notification_id: parseInt(notification_id) },
      data: { is_read: true, read_at: new Date() }
    });

    res.status(200).json({ message: 'Notification marked as read', data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const user_id = req.user?.user_id;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const result = await prisma.notification.updateMany({
      where: { user_id, is_read: false },
      data: { is_read: true, read_at: new Date() }
    });

    res.status(200).json({ message: 'All notifications marked as read', updated_count: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { notification_id } = req.params;
    const user_id = req.user?.user_id;
    if (!notification_id || !user_id) return res.status(400).json({ error: 'notification_id and user_id are required' });

    const notification = await prisma.notification.findUnique({ where: { notification_id: parseInt(notification_id) } });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.user_id !== user_id) return res.status(403).json({ error: 'Not authorized to delete this notification' });

    await prisma.notification.delete({ where: { notification_id: parseInt(notification_id) } });
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const user_id = req.user?.user_id;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const count = await prisma.notification.count({ where: { user_id, is_read: false } });
    res.status(200).json({ unread_count: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

exports.sendTestNotification = async (req, res) => {
  try {
    const { user_id, title, body } = req.body;
    if (!user_id || !title || !body) return res.status(400).json({ error: 'user_id, title, and body are required' });

    const user = await prisma.user.findUnique({ where: { user_id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const subscription = await prisma.pushSubscription.findUnique({ where: { user_id } });
    if (!subscription) return res.status(400).json({ error: 'User has no active push subscription' });

    await notificationService.sendPushNotificationToUser(user_id, title, body, { notification_type: 'test', action_url: '/notifications' });

    res.status(200).json({ message: 'Test notification sent successfully', data: { user_id, title, body } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};
