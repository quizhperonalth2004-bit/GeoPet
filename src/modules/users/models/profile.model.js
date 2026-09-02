const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    number_phone: {
        type: Number,
        required: true
    },
    profile_picture: {
        type: String,
        default: 'assets/dogs/perroLogin.jpg'
    },
    photo_profile_url: {
        type: String,
        default: 'assets/dogs/perroLogin.jpg'
    },
    photo_cover_url: {
        type: String,
        required: false,
        default: ''
    },
    word_description: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    notifications: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notification'
    }]
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
