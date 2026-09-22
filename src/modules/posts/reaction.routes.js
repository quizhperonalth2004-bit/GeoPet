const express = require('express');
const router = express.Router();
const reactionController = require('./controllers/reaction.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.post('/new', authMiddleware.verifyToken, reactionController.reactionCreate);
router.get('/check', reactionController.checkUserReaction);

module.exports = router;
