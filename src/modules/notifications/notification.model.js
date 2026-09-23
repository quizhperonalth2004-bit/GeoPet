const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    emiter_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['like', 'comment', 'foro', 'post']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    view: {
        type: Boolean,
        default: false
    },
    post_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: false
    },
    forum_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Forum',
        required: false
    },
    comment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        required: false
    }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
