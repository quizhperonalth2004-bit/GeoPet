const Pet = require('./models/pet.model');
const User = require('../users/models/user.model');
const cloudinary = require('../../config/cloudinary');

class PetsService {
    async createPet(data, files) {
        const ownerId = data.owner;
        if (!ownerId) {
            const error = new Error('Owner ID is required');
            error.statusCode = 400;
            throw error;
        }

        // Verificar si el usuario existe
        const user = await User.findById(ownerId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        let photo_url = '';
        if (files && files.photo_profile && files.photo_profile.length > 0) {
            const result = await cloudinary.uploader.upload(files.photo_profile[0].path, {
                folder: 'pets',
                transformation: [{ width: 300, height: 300, crop: 'fill' }]
            });
            if (result && result.secure_url) {
                photo_url = result.secure_url;
            }
        }

        // Si vino en body como string URL o fallback
        if (!photo_url && data.photo_url) {
            photo_url = data.photo_url;
        }

        if (!photo_url) {
            const error = new Error('La imagen de perfil es requerida');
            error.statusCode = 400;
            throw error;
        }

        const petData = {
            ...data,
            owner: ownerId,
            photo_url: photo_url
        };

        const pet = new Pet(petData);
        await pet.save();
        return pet;
    }

    async getAllPets() {
        return await Pet.find();
    }

    async getPetsByUser(ownerId) {
        if (!ownerId) {
            const error = new Error('Owner ID is required');
            error.statusCode = 400;
            throw error;
        }

        const user = await User.findById(ownerId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        return await Pet.find({ owner: ownerId });
    }

    async changeStatusPet(petId, status) {
        if (typeof status !== 'boolean') {
            const error = new Error('El nuevo estado debe ser un valor booleano.');
            error.statusCode = 400;
            throw error;
        }

        const pet = await Pet.findByIdAndUpdate(
            petId,
            { status },
            { new: true, runValidators: true }
        );

        if (!pet) {
            const error = new Error('Mascota no encontrada.');
            error.statusCode = 404;
            throw error;
        }

        return pet;
    }

    async getPetById(id) {
        return await Pet.findById(id);
    }

    async updatePet(id, updates) {
        const allowedUpdates = ['name', 'breed', 'sex', 'age', 'size', 'color', 'has_disease', 'requires_treatment', 'sterilization_status', 'photo_url', 'photo', 'status'];
        const isValidOperation = Object.keys(updates).every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            const error = new Error('Invalid updates!');
            error.statusCode = 400;
            throw error;
        }

        return await Pet.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    }

    async deletePet(id) {
        return await Pet.findByIdAndDelete(id);
    }
}

module.exports = new PetsService();
