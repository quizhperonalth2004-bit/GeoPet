const express = require('express');
const router = express.Router();
const commentController = require('./comment.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.post('/new', authMiddleware.verifyToken, commentController.createComment);
router.post('/post/new', authMiddleware.verifyToken, commentController.createCommentPost);
router.get('/:id', commentController.getCommentById);

module.exports = router;
