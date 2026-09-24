const Pet = require('./models/pet.model');
const User = require('../users/models/user.model');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../shared/errors');

class PetsService {
    /**
     * @param {Object} [dependencies] Inyección de dependencias para modelos y servicios externos
     */
    constructor(dependencies = {}) {
        this.petModel = dependencies.petModel || Pet;
        this.userModel = dependencies.userModel || User;
        this.cloudinaryUploader = dependencies.cloudinaryUploader || cloudinary.uploader;
    }

    async createPet(data, files, currentUser) {
        const currentUserId = currentUser ? String(currentUser.userId || currentUser.id || currentUser._id || '') : null;
        const role = currentUser ? (currentUser.rol || currentUser.role) : null;

        let ownerId = data.owner || currentUserId;
        if (!ownerId) {
            throw new BadRequestError('Owner ID is required');
        }

        // Si el usuario no es admin, no permitir registrar mascotas asignadas a otro ID
        if (currentUserId && String(ownerId) !== currentUserId && role !== 'admin') {
            throw new ForbiddenError('Acceso denegado: No puedes registrar una mascota a nombre de otro usuario.');
        }

        // Verificar si el usuario existe
        const user = await this.userModel.findById(ownerId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        let photo_url = '';
        if (files && files.photo_profile && files.photo_profile.length > 0) {
            const filePath = files.photo_profile[0].path;
            try {
                const result = await this.cloudinaryUploader.upload(filePath, {
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
            throw new BadRequestError('La imagen de perfil es requerida');
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

        const pet = new this.petModel(petData);
        await pet.save();
        return pet;
    }

    async getAllPets() {
        return await this.petModel.find();
    }

    async getPetsByUser(ownerId) {
        if (!ownerId) {
            throw new BadRequestError('Owner ID is required');
        }

        const user = await this.userModel.findById(ownerId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        return await this.petModel.find({ owner: ownerId });
    }

    async changeStatusPet(petId, status, currentUser) {
        if (typeof status !== 'boolean') {
            throw new BadRequestError('El nuevo estado debe ser un valor booleano.');
        }

        const pet = await this.petModel.findById(petId);
        if (!pet) {
            throw new NotFoundError('Mascota no encontrada.');
        }

        if (currentUser) {
            const currentUserId = String(currentUser.userId || currentUser.id || currentUser._id || '');
            const petOwnerId = String(pet.owner?._id || pet.owner);
            const role = currentUser.rol || currentUser.role;

            if (currentUserId !== petOwnerId && role !== 'admin') {
                throw new ForbiddenError('Acceso denegado: Solo el propietario o un administrador pueden modificar el estado de esta mascota.');
            }
        }

        pet.status = status;
        await pet.save();
        return pet;
    }

    async getPetById(id) {
        return await this.petModel.findById(id);
    }

    async updatePet(id, updates, currentUser) {
        const allowedUpdates = ['name', 'breed', 'sex', 'age', 'size', 'color', 'has_disease', 'requires_treatment', 'sterilization_status', 'photo_url', 'photo', 'status'];
        const isValidOperation = Object.keys(updates).every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            throw new BadRequestError('Invalid updates!');
        }

        const pet = await this.petModel.findById(id);
        if (!pet) {
            throw new NotFoundError('Pet not found');
        }

        if (currentUser) {
            const currentUserId = String(currentUser.userId || currentUser.id || currentUser._id || '');
            const petOwnerId = String(pet.owner?._id || pet.owner);
            const role = currentUser.rol || currentUser.role;

            if (currentUserId !== petOwnerId && role !== 'admin') {
                throw new ForbiddenError('Acceso denegado: Solo el propietario o un administrador pueden editar esta mascota.');
            }
        }

        Object.assign(pet, updates);
        await pet.save();
        return pet;
    }

    async deletePet(id, currentUser) {
        const pet = await this.petModel.findById(id);
        if (!pet) {
            throw new NotFoundError('Pet not found');
        }

        if (currentUser) {
            const currentUserId = String(currentUser.userId || currentUser.id || currentUser._id || '');
            const petOwnerId = String(pet.owner?._id || pet.owner);
            const role = currentUser.rol || currentUser.role;

            if (currentUserId !== petOwnerId && role !== 'admin') {
                throw new ForbiddenError('Acceso denegado: Solo el propietario o un administrador pueden eliminar esta mascota.');
            }
        }

        await this.petModel.findByIdAndDelete(id);
        return pet;
    }
}

const petsService = new PetsService();
module.exports = petsService;
module.exports.PetsService = PetsService;
