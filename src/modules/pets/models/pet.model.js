const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    type: {
        type: String,
        default: 'dog'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    breed: {
        type: String,
        required: true,
        trim: true
    },
    sex: {
        type: String,
        default: ''
    },
    age: {
        type: String,
        default: ''
    },
    size: {
        type: String,
        default: ''
    },
    color: {
        type: String,
        default: ''
    },
    has_disease: {
        type: Boolean,
        default: false
    },
    requires_treatment: {
        type: Boolean,
        default: false
    },
    sterilization_status: {
        type: Boolean,
        default: true
    },
    photo_url: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

const Pet = mongoose.model('Pet', petSchema);

module.exports = Pet;
