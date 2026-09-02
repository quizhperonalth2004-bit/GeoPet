const mongoose = require('mongoose');
const { Schema } = mongoose;

const forumSchema = new Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    answers: [{
        commentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment'
        }
    }],
    status: {
        type: String,
        enum: ['active', 'cancelled'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

forumSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Forum = mongoose.model('Forum', forumSchema);

module.exports = Forum;
