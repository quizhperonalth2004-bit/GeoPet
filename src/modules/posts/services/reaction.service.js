const Reaction = require('../models/reaction.model');
const Post = require('../models/post.model');
const Profile = require('../../users/models/profile.model');
const Notification = require('../models/notification.model');

class ReactionService {
    async createReaction(userId, postId) {
        if (!userId || !postId) {
            const error = new Error('Todos los campos son obligatorios');
            error.statusCode = 400;
            throw error;
        }

        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Publicación no encontrada');
            error.statusCode = 404;
            throw error;
        }

        const existingReaction = await Reaction.findOne({ user: userId, post: postId });
        if (existingReaction) {
            const error = new Error('Ya has reaccionado a esta publicación');
            error.statusCode = 409;
            throw error;
        }

        const newReaction = new Reaction({
            user: userId,
            post: postId
        });

        // Enviar notificación al dueño del post si no es el mismo
        if (String(post.owner) !== String(userId)) {
            try {
                const notif = new Notification({
                    type: 'like',
                    emiter_id: userId,
                    receiver_id: post.owner,
                    post_id: post._id
                });
                const savedNotif = await notif.save();

                const ownerProfile = await Profile.findOne({ user: post.owner });
                if (ownerProfile) {
                    ownerProfile.notifications = ownerProfile.notifications || [];
                    ownerProfile.notifications.push(savedNotif._id);
                    await ownerProfile.save();
                }
            } catch (notifErr) {
                console.warn('[ReactionService] Error al enviar notificación de reacción:', notifErr.message);
            }
        }

        await newReaction.save();

        post.amount_reactions = (post.amount_reactions || 0) + 1;
        await post.save();

        return newReaction;
    }

    async checkUserReaction(userId, postId) {
        if (!userId || !postId) {
            const error = new Error('User ID and Post ID are required');
            error.statusCode = 400;
            throw error;
        }

        const reaction = await Reaction.findOne({ user: userId, post: postId });
        return { hasReacted: !!reaction };
    }
}

module.exports = new ReactionService();
