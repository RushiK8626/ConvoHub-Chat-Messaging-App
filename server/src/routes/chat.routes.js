const express = require('express');
const router = express.Router();
const chatController = require('../controller/chat.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { upload } = require('../config/upload');

router.use(verifyToken);

router.get('/:id/info', chatController.getChatInfo);
router.get('/search', chatController.searchChats);
router.post('/', upload.single('group_image'), chatController.createChat);
router.get('/:id', chatController.getChatById);
router.put('/:id', upload.single('group_image'), chatController.updateChat);
router.delete('/:id', chatController.deleteChat);
router.get('/user/:userId', chatController.getUserChats);
router.get('/user/:userId/preview', chatController.getUserChatsPreview);

router.post('/:chatId/members', (req, res) => chatController.addChatMember(req, res, req.io));
router.delete('/:chatId/members/:userId', (req, res) => chatController.removeChatMember(req, res, req.io));
router.post('/:chatId/exit', (req, res) => chatController.exitGroupChat(req, res, req.io));

module.exports = router;