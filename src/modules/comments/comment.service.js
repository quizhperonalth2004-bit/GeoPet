const Comment = require('./comment.model');
const Post = require('../posts/post.model');
const Profile = require('../users/models/profile.model');
const User = require('../users/models/user.model');
const Notification = require('../notifications/notification.model');

class CommentService {
    async createComment({ content, forumId, userId }) {
        const error = new Error('El módulo de foros ha sido retirado.');
        error.statusCode = 410;
        throw error;
    }

    async createCommentPost({ content, postId, userId }) {
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('No se encuentra la publicación');
            error.statusCode = 404;
            throw error;
        }

        const newComment = new Comment({
            content,
            createdBy: userId,
            post: postId
        });

        const savedComment = await newComment.save();

        // Enviar notificación al dueño del post si no es quien comenta
        if (String(post.owner) !== String(userId)) {
            try {
                const notif = new Notification({
                    type: 'comment',
                    emiter_id: userId,
                    receiver_id: post.owner,
                    post_id: post._id,
                    comment_id: savedComment._id
                });
                const savedNotif = await notif.save();

                const ownerProfile = await Profile.findOne({ user: post.owner });
                if (ownerProfile) {
                    ownerProfile.notifications = ownerProfile.notifications || [];
                    ownerProfile.notifications.push(savedNotif._id);
                    await ownerProfile.save();
                }
            } catch (notifErr) {
                console.warn('[CommentService] Error al enviar notificación de comentario:', notifErr.message);
            }
        }

        post.comments = post.comments || [];
        post.comments.push({ commentId: savedComment._id });
        post.amount_comments = (post.amount_comments || 0) + 1;
        await post.save();

        return savedComment;
    }

    async getCommentById(id) {
        const comment = await Comment.findById(id);
        if (!comment) {
            const error = new Error('Comentario no encontrado');
            error.statusCode = 404;
            throw error;
        }

        const profile = await Profile.findOne({ user: comment.createdBy });
        const user = await User.findById(comment.createdBy);

        return {
            comment: {
                _id: comment._id,
                content: comment.content,
                createdBy: comment.createdBy,
                forum: comment.forum,
                post: comment.post,
                createdAt: comment.createdAt,
                updatedAt: comment.updatedAt
            },
            profileData: {
                profile: profile ? profile.toObject() : {},
                user: user ? user.toObject() : {}
            }
        };
    }
}

module.exports = new CommentService();
