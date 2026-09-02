const express = require('express');
const router = express.Router();
const reactionController = require('./controllers/reaction.controller');

router.post('/new', reactionController.reactionCreate);
router.get('/check', reactionController.checkUserReaction);

module.exports = router;
