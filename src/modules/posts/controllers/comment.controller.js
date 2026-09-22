const commentService = require('../services/comment.service');

const commentController = {
    createComment: async (req, res) => {
        const { content, forumId } = req.body;
        const createdBy = (req.user && (req.user.userId || req.user.id || req.user._id)) || req.body.createdBy;
        try {
            const savedComment = await commentService.createComment({ content, forumId, userId: createdBy });
            res.status(201).json(savedComment);
        } catch (error) {
            console.error('Error al crear comentario en foro:', error);
            res.status(error.statusCode || 500).json({ error: error.message || 'Server error' });
        }
    },

    getCommentById: async (req, res) => {
        const { id } = req.params;
        try {
            const responseData = await commentService.getCommentById(id);
            res.json(responseData);
        } catch (error) {
            console.error('Error al obtener el comentario:', error);
            res.status(error.statusCode || 500).json({ error: error.message || 'Error interno del servidor' });
        }
    },

    createCommentPost: async (req, res) => {
        const { content, postId } = req.body;
        const createdBy = (req.user && (req.user.userId || req.user.id || req.user._id)) || req.body.createdBy;
        try {
            const savedComment = await commentService.createCommentPost({ content, postId, userId: createdBy });
            res.status(201).json(savedComment);
        } catch (error) {
            console.error('Error al crear comentario en post:', error);
            res.status(error.statusCode || 500).json({ error: error.message || 'Error del servidor' });
        }
    }
};

module.exports = commentController;
