const Pet = require('./models/pet.model');
const User = require('../users/models/user.model');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

class PetsService {
    async createPet(data, files, currentUser) {
        const currentUserId = currentUser ? String(currentUser.userId || currentUser.id || currentUser._id || '') : null;
        const role = currentUser ? (currentUser.rol || currentUser.role) : null;

        let ownerId = data.owner || currentUserId;
        if (!ownerId) {
            const error = new Error('Owner ID is required');
            error.statusCode = 400;
            throw error;
        }

        // Si el usuario no es admin, no permitir registrar mascotas asignadas a otro ID
        if (currentUserId && String(ownerId) !== currentUserId && role !== 'admin') {
            const error = new Error('Acceso denegado: No puedes registrar una mascota a nombre de otro usuario.');
            error.statusCode = 403;
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
            const filePath = files.photo_profile[0].path;
            try {
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: 'pets',
                    transformation: [{ width: 300, height: 300, crop: 'fill' }]
                });
                if (result && result.secure_url) {
                    photo_url = result.secure_url;
                }
            } catch (uploadError) {
                console.warn('[PetsService] Error al subir foto de mascota a Cloudinary:', uploadError.message);
            } finally {
                // Limpieza garantizada del archivo temporal local de Multer
                try {
                    await fs.promises.unlink(filePath);
                } catch (unlinkErr) {
                    if (unlinkErr.code !== 'ENOENT') {
                        console.warn('[PetsService] Error al eliminar archivo temporal de mascota:', unlinkErr.message);
                    }
                }
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
            name: (data.name && typeof data.name === 'string' && data.name.trim()) ? data.name.trim() : 'Mascota avistada',
            breed: (data.breed && typeof data.breed === 'string' && data.breed.trim()) ? data.breed.trim() : 'Sin especificar',
            sex: (data.sex && typeof data.sex === 'string' && data.sex.trim()) ? data.sex.trim() : 'Desconocido',
            age: (data.age && typeof data.age === 'string' && data.age.trim()) ? data.age.trim() : 'Desconocida',
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

    async changeStatusPet(petId, status, currentUser) {
        if (typeof status !== 'boolean') {
            const error = new Error('El nuevo estado debe ser un valor booleano.');
            error.statusCode = 400;
            throw error;
        }

        const pet = await Pet.findById(petId);
        if (!pet) {
            const error = new Error('Mascota no encontrada.');
            error.statusCode = 404;
            throw error;
        }

        if (currentUser) {
            const currentUserId = String(currentUser.userId || currentUser.id || currentUser._id || '');
            const petOwnerId = String(pet.owner?._id || pet.owner);
            const role = currentUser.rol || currentUser.role;

            if (currentUserId !== petOwnerId && role !== 'admin') {
                const error = new Error('Acceso denegado: Solo el propietario o un administrador pueden modificar el estado de esta mascota.');
                error.statusCode = 403;
                throw error;
            }
        }

        pet.status = status;
        await pet.save();
        return pet;
    }

    async getPetById(id) {
        return await Pet.findById(id);
    }

    async updatePet(id, updates, currentUser) {
        const allowedUpdates = ['name', 'breed', 'sex', 'age', 'size', 'color', 'has_disease', 'requires_treatment', 'sterilization_status', 'photo_url', 'photo', 'status'];
        const isValidOperation = Object.keys(updates).every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            const error = new Error('Invalid updates!');
            error.statusCode = 400;
            throw error;
        }

        const pet = await Pet.findById(id);
        if (!pet) {
            const error = new Error('Pet not found');
            error.statusCode = 404;
            throw error;
        }

        if (currentUser) {
            const currentUserId = String(currentUser.userId || currentUser.id || currentUser._id || '');
            const petOwnerId = String(pet.owner?._id || pet.owner);
            const role = currentUser.rol || currentUser.role;

            if (currentUserId !== petOwnerId && role !== 'admin') {
                const error = new Error('Acceso denegado: Solo el propietario o un administrador pueden editar esta mascota.');
                error.statusCode = 403;
                throw error;
            }
        }

        Object.assign(pet, updates);
        await pet.save();
        return pet;
    }

    async deletePet(id, currentUser) {
        const pet = await Pet.findById(id);
        if (!pet) {
            const error = new Error('Pet not found');
            error.statusCode = 404;
            throw error;
        }

        if (currentUser) {
            const currentUserId = String(currentUser.userId || currentUser.id || currentUser._id || '');
            const petOwnerId = String(pet.owner?._id || pet.owner);
            const role = currentUser.rol || currentUser.role;

            if (currentUserId !== petOwnerId && role !== 'admin') {
                const error = new Error('Acceso denegado: Solo el propietario o un administrador pueden eliminar esta mascota.');
                error.statusCode = 403;
                throw error;
            }
        }

        await Pet.findByIdAndDelete(id);
        return pet;
    }
}

module.exports = new PetsService();
