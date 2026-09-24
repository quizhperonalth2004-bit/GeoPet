const express = require('express');
const router = express.Router();
const commentController = require('./comment.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
    createCommentPostDto,
    createCommentForumDto,
    commentIdParamDto
} = require('./comments.dto');

router.post('/new', authMiddleware.verifyToken, validate(createCommentForumDto), commentController.createComment);
router.post('/post/new', authMiddleware.verifyToken, validate(createCommentPostDto), commentController.createCommentPost);
router.get('/:id', validate({ params: commentIdParamDto }), commentController.getCommentById);

module.exports = router;
