const reactionService = require('../services/reaction.service');

const reactionController = {
    reactionCreate: async (req, res) => {
        try {
            const { userId, postId } = req.body;
            const newReaction = await reactionService.createReaction(userId, postId);
            res.status(201).json(newReaction);
        } catch (error) {
            console.error('Error al crear la reacción:', error);
            res.status(error.statusCode || 500).json({ error: error.message || 'Error al crear la reacción' });
        }
    },

    checkUserReaction: async (req, res) => {
        try {
            const { userId, postId } = req.query;
            const result = await reactionService.checkUserReaction(userId, postId);
            res.status(200).json(result);
        } catch (error) {
            console.error('Error checking user reaction:', error);
            res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
        }
    }
};

module.exports = reactionController;
