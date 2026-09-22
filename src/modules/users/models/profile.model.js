const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    number_phone: {
        type: Number,
        required: false,
        default: 0
    },
    profile_picture: {
        type: String,
        default: 'assets/default-avatar.png'
    },
    photo_profile_url: {
        type: String,
        default: 'assets/default-avatar.png'
    },
    photo_cover_url: {
        type: String,
        required: false,
        default: ''
    },
    word_description: {
        type: String,
        required: false,
        default: 'Amante de las mascotas 🐾'
    },
    description: {
        type: String,
        required: false,
        default: 'Usuario de GeoPet'
    },
    notifications: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notification'
    }]
});

// Índice clave para búsquedas frecuentes por usuario
profileSchema.index({ user: 1 }, { unique: true });

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
