const Comment = require('./comment.model');
const Post = require('../posts/post.model');
const Profile = require('../users/models/profile.model');
const User = require('../users/models/user.model');
const Notification = require('../notifications/notification.model');
const { AppError, NotFoundError } = require('../../shared/errors');

class CommentService {
    /**
     * @param {Object} [dependencies] Inyección de dependencias para modelos y servicios
     */
    constructor(dependencies = {}) {
        this.commentModel = dependencies.commentModel || Comment;
        this.postModel = dependencies.postModel || Post;
        this.profileModel = dependencies.profileModel || Profile;
        this.userModel = dependencies.userModel || User;
        this.notificationModel = dependencies.notificationModel || Notification;
    }

    async createComment({ content, forumId, userId }) {
        throw new AppError('El módulo de foros ha sido retirado.', 410);
    }

    async createCommentPost({ content, postId, userId }) {
        const post = await this.postModel.findById(postId);
        if (!post) {
            throw new NotFoundError('No se encuentra la publicación');
        }

        const newComment = new this.commentModel({
            content,
            createdBy: userId,
            post: postId
        });

        const savedComment = await newComment.save();

        // Enviar notificación al dueño del post si no es quien comenta
        if (String(post.owner) !== String(userId)) {
            try {
                const notif = new this.notificationModel({
                    type: 'comment',
                    emiter_id: userId,
                    receiver_id: post.owner,
                    post_id: post._id,
                    comment_id: savedComment._id
                });
                const savedNotif = await notif.save();

                const ownerProfile = await this.profileModel.findOne({ user: post.owner });
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
        const comment = await this.commentModel.findById(id);
        if (!comment) {
            throw new NotFoundError('Comentario no encontrado');
        }

        const profile = await this.profileModel.findOne({ user: comment.createdBy });
        const user = await this.userModel.findById(comment.createdBy);

        return {
            comment: {
                _id: comment._id,
                content: comment.content,
                createdBy: comment.createdBy,
                post: comment.post,
                createdAt: comment.createdAt,
                updatedAt: comment.updatedAt
            },
            profileData: {
                profile: profile ? (profile.toObject ? profile.toObject() : profile) : {},
                user: user ? (user.toObject ? user.toObject() : user) : {}
            }
        };
    }
}

const commentService = new CommentService();
module.exports = commentService;
module.exports.CommentService = CommentService;
