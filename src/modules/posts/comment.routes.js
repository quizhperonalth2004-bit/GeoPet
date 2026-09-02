const express = require('express');
const router = express.Router();
const commentController = require('./controllers/comment.controller');

router.post('/new', commentController.createComment);
router.post('/post/new', commentController.createCommentPost);
router.get('/:id', commentController.getCommentById);

module.exports = router;
