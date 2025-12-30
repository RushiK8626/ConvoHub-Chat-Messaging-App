const express = require('express');
const router = express.Router();
const userCacheController = require('../controller/user-cache.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

router.get('/profile/:userId', userCacheController.getUserProfile);
router.get('/chats/:userId', userCacheController.getChatMemberships);
router.get('/friends/:userId', userCacheController.getFriendList);
router.delete('/invalidate/:userId', userCacheController.invalidateUserCaches);

module.exports = router;
