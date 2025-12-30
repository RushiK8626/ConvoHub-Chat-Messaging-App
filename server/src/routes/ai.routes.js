const express = require('express');
const router = express.Router();
const aiController = require('../controller/ai.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/test', (req, res) => res.json({ message: 'AI routes are working' }));

router.use(verifyToken);

router.post('/smart-replies', aiController.generateSmartReplies);
router.post('/translate', aiController.translateMessage);
router.post('/summarize', aiController.summarizeConversation);
router.post('/detect-language', aiController.detectLanguage);
router.post('/conversation-starters', aiController.generateConversationStarters);
router.get('/status', aiController.checkStatus);
router.post('/chat', aiController.aiChat);
router.post('/search-messages', aiController.searchMessages);

module.exports = router;
