const Forum = require('../models/forum.model');
const notificationService = require('./notification.service');

class ForumService {
    async createForum({ question, date, createdBy }) {
        const newForum = new Forum({ question, date, createdBy });
        const savedForum = await newForum.save();

        // Enviar notificaciones a otros perfiles de forma asíncrona
        notificationService.broadcastNotification({
            type: 'foro',
            emitterId: createdBy,
            itemId: savedForum._id,
            itemField: 'forum_id'
        }).catch(err => console.warn('[ForumService] Error enviando broadcast de foro:', err.message));

        return savedForum;
    }

    async getForums() {
        return await Forum.find();
    }

    async getForumById(id) {
        return await Forum.findById(id).populate({
            path: 'answers.commentId',
            model: 'Comment'
        });
    }

    async updateForum(id, data) {
        return await Forum.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteForum(id) {
        return await Forum.findByIdAndDelete(id);
    }
}

module.exports = new ForumService();
