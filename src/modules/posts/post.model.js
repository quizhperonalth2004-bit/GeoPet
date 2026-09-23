const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: false
    },
    body: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            required: false,
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitud, latitud]
            required: false
        }
    },
    address: {
        type: String,
        required: false
    },
    amount_comments: {
        type: Number,
        default: 0
    },
    comments: [{
        commentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment'
        }
    }],
    reward: {
        type: Number,
        default: 0
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    photo_post_url: {
        type: String,
        required: false
    },
    sightings: [{
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post'
        },
        post_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post'
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        location: {
            lat: {
                type: Number,
                required: true
            },
            lng: {
                type: Number,
                required: true
            }
        },
        comment: {
            type: String,
            trim: true
        },
        photo_url: {
            type: String
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
});

// Índice geoespacial para la búsqueda por ubicación
postSchema.index({ location: '2dsphere' });

// Índices compuestos para ordenación y filtrado rápido
postSchema.index({ type: 1, createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ owner: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
