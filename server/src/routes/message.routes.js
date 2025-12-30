const express = require('express');
const router = express.Router();
const messageController = require('../controller/message.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { upload } = require('../config/upload');

router.use(verifyToken);

router.post('/', messageController.createMessage);
router.post('/upload', upload.single('file'), messageController.uploadFileAndCreateMessage);
router.post('/forward', messageController.forwardMessage);
router.get('/chat/:chatId/recent', messageController.getRecentMessages);
router.get('/chat/:chatId', messageController.getMessagesByChat);
router.put('/chat/:chatId/read-all/:userId', messageController.markAllMessagesAsRead);
router.get('/unread/:userId', messageController.getUnreadMessageCount);
router.delete('/batch', messageController.deleteBatchMessagesForUser);
router.delete('/chat/:chatId/clear', messageController.deleteAllMessagesInChatForUser);
router.delete('/:id', messageController.deleteMessageForUser);
router.delete('/:id/all', messageController.deleteMessageForAll);
router.get('/:messageId/attachments', messageController.getMessageAttachments);

module.exports = router;