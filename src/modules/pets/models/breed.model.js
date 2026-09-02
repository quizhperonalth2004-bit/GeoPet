const mongoose = require('mongoose');

const breedSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['dog', 'cat', 'bird', 'otro'],
        default: 'dog'
    }
});

const Breed = mongoose.model('Breed', breedSchema);

module.exports = Breed;
