const commentService = require('./comment.service');

const commentController = {
    createComment: async (req, res, next) => {
        const { content, forumId } = req.body;
        const createdBy = (req.user && (req.user.userId || req.user.id || req.user._id)) || req.body.createdBy;
        try {
            const savedComment = await commentService.createComment({ content, forumId, userId: createdBy });
            res.status(201).json(savedComment);
        } catch (error) {
            console.error('Error al crear comentario en foro:', error);
            next(error);
        }
    },

    getCommentById: async (req, res, next) => {
        const { id } = req.params;
        try {
            const responseData = await commentService.getCommentById(id);
            res.json(responseData);
        } catch (error) {
            console.error('Error al obtener el comentario:', error);
            next(error);
        }
    },

    createCommentPost: async (req, res, next) => {
        const { content, postId } = req.body;
        const createdBy = (req.user && (req.user.userId || req.user.id || req.user._id)) || req.body.createdBy;
        try {
            const savedComment = await commentService.createCommentPost({ content, postId, userId: createdBy });
            res.status(201).json(savedComment);
        } catch (error) {
            console.error('Error al crear comentario en post:', error);
            next(error);
        }
    }
};

module.exports = commentController;
