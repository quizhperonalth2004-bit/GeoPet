const mongoose = require('mongoose');
const Post = require('../models/post.model');
const User = require('../../users/models/user.model');
const Profile = require('../../users/models/profile.model');
const Pet = require('../../pets/models/pet.model');
const cloudinary = require('../../../config/cloudinary');
const notificationService = require('./notification.service');
const eventBus = require('../../../shared/eventBus');

class PostService {
    async fetchOwnerData(ownerId) {
        if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
            return {
                profile: { photo_profile_url: 'assets/dogs/perroLogin.jpg', number_phone: '' },
                user: { name: 'Comunidad', last_name: 'Patas Unidas' }
            };
        }

        try {
            const user = await User.findById(ownerId);
            const profile = await Profile.findOne({ user: ownerId });

            return {
                profile: profile ? profile.toObject() : { photo_profile_url: 'assets/dogs/perroLogin.jpg', number_phone: '' },
                user: user ? user.toObject() : { name: 'Comunidad', last_name: 'Patas Unidas' }
            };
        } catch (error) {
            return {
                profile: { photo_profile_url: 'assets/dogs/perroLogin.jpg', number_phone: '' },
                user: { name: 'Comunidad', last_name: 'Patas Unidas' }
            };
        }
    }

    async fetchPetData(petId) {
        if (!petId || !mongoose.Types.ObjectId.isValid(petId)) return null;
        try {
            const pet = await Pet.findById(petId);
            return pet ? pet.toObject() : null;
        } catch (error) {
            return null;
        }
    }

    async createPost(data, files) {
        let { type, body, coordinates, reward, owner, pet, address } = data;
        let photo_url = '';

        switch (type) {
            case 'Perdida':
            case 'Avistamiento':
                if (!coordinates) {
                    const error = new Error('Las coordenadas son requeridas para este tipo de publicación');
                    error.statusCode = 400;
                    throw error;
                }
                break;
            case 'Adopcion':
                coordinates = [-3.995008843716655, -79.20786376590335];
                break;
            default:
                const error = new Error('Tipo de publicación no válido');
                error.statusCode = 400;
                throw error;
        }

        let parsedCoordinates = [];
        if (typeof coordinates === 'string') {
            try {
                parsedCoordinates = JSON.parse(coordinates);
            } catch (error) {
                const err = new Error('Las coordenadas tienen un formato incorrecto');
                err.statusCode = 400;
                throw err;
            }
        } else if (Array.isArray(coordinates)) {
            parsedCoordinates = coordinates;
        }

        if (files && files.photo_post_url && files.photo_post_url.length > 0) {
            try {
                const result = await cloudinary.uploader.upload(files.photo_post_url[0].path, {
                    folder: 'posts',
                    transformation: [{ width: 300, height: 300, crop: 'fill' }]
                });
                if (result && result.secure_url) {
                    photo_url = result.secure_url;
                }
            } catch (error) {
                console.warn('[PostService] Error al subir foto de publicación a Cloudinary:', error.message);
            }
        }

        if (!photo_url && data.photo_post_url && typeof data.photo_post_url === 'string') {
            photo_url = data.photo_post_url;
        }

        const newPost = new Post({
            type,
            body,
            address: (address && typeof address === 'string') ? address.trim() : undefined,
            location: (parsedCoordinates && parsedCoordinates.length >= 2) ? { type: 'Point', coordinates: parsedCoordinates } : undefined,
            reward: Number(reward) || 0,
            owner,
            pet: pet || undefined,
            photo_post_url: photo_url
        });

        const savedPost = await newPost.save();

        // Enviar notificaciones a otros perfiles de forma asíncrona
        notificationService.broadcastNotification({
            type: 'post',
            emitterId: owner,
            itemId: savedPost._id,
            itemField: 'post_id'
        }).catch(err => console.warn('[PostService] Error enviando broadcast de post:', err.message));

        eventBus.emit('post:created', { post: savedPost, owner });

        return { post: savedPost, pet };
    }

    async getPostByUserId(ownerId) {
        if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
            return [];
        }

        try {
            // El owner en Post puede ser el User ID o el Profile ID
            const ownerIds = [ownerId];

            // Buscar si existe un perfil para este owner (en caso de que owner sea User ID)
            const profileByUser = await Profile.findOne({ user: ownerId });
            if (profileByUser) {
                ownerIds.push(profileByUser._id);
            } else {
                // Si ownerId fue el ID del perfil, obtener el user asociado
                const profileById = await Profile.findById(ownerId);
                if (profileById && profileById.user) {
                    ownerIds.push(profileById.user);
                }
            }

            const posts = await Post.find({ owner: { $in: ownerIds } }).sort({ createdAt: -1 });
            if (!posts || posts.length === 0) return [];

            return await Promise.all(
                posts.map(async (post) => {
                    const petObj = (post.type !== 'Avistamiento' && post.pet) ? await this.fetchPetData(post.pet) : null;
                    const petPhoto = post.photo_post_url || (petObj ? petObj.photo_url : 'assets/dogs/perroLogin.jpg');

                    return {
                        petPhoto: petPhoto,
                        petDetails: petObj,
                        ...post.toObject()
                    };
                })
            );
        } catch (error) {
            console.error('[PostService] Error al obtener posts por usuario:', error.message);
            return [];
        }
    }

    async getPost() {
        const posts = await Post.find().sort({ createdAt: -1 });
        if (!posts) return [];

        return await Promise.all(
            posts.map(async (post) => {
                const ownerData = await this.fetchOwnerData(post.owner);
                const petObj = (post.type !== 'Avistamiento' && post.pet) ? await this.fetchPetData(post.pet) : null;
                const petPhoto = post.photo_post_url || (petObj ? petObj.photo_url : 'assets/dogs/perroLogin.jpg');

                return {
                    profilePhoto: ownerData.profile?.photo_profile_url || 'assets/dogs/perroLogin.jpg',
                    firstName: ownerData.user?.name || 'Usuario',
                    lastName: ownerData.user?.last_name || '',
                    petPhoto: petPhoto,
                    petDetails: petObj,
                    numberPhone: ownerData.profile?.number_phone || '',
                    ...post.toObject()
                };
            })
        );
    }

    async getPostsAll() {
        return await Post.find({}).sort({ createdAt: -1 });
    }

    async getPostsAllByUser(ownerId) {
        return await Post.find({ owner: ownerId }).sort({ createdAt: -1 });
    }

    async getPostById(postId) {
        const post = await Post.findById(postId).populate({
            path: 'sightings.user',
            select: 'name last_name username email'
        });

        if (!post) return null;

        const ownerData = await this.fetchOwnerData(post.owner);
        const petObj = (post.type !== 'Avistamiento' && post.pet) ? await this.fetchPetData(post.pet) : null;
        const petPhoto = post.photo_post_url || (petObj ? petObj.photo_url : 'assets/dogs/perroLogin.jpg');

        return {
            profilePhoto: ownerData.profile?.photo_profile_url || 'assets/dogs/perroLogin.jpg',
            firstName: ownerData.user?.name || 'Usuario',
            lastName: ownerData.user?.last_name || '',
            petPhoto: petPhoto,
            petDetails: petObj,
            numberPhone: ownerData.profile?.number_phone || '',
            ...post.toObject()
        };
    }

    async addSighting(postId, data, user, files) {
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            const error = new Error('ID de publicación no válido');
            error.statusCode = 400;
            throw error;
        }

        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Publicación no encontrada');
            error.statusCode = 404;
            throw error;
        }

        const userId = user?.userId || user?.id || user?._id;
        if (!userId) {
            const error = new Error('Usuario no autenticado');
            error.statusCode = 401;
            throw error;
        }

        // Extraer coordenadas de latitud y longitud
        let lat;
        let lng;

        let locationData = data.location;
        if (typeof locationData === 'string') {
            try {
                locationData = JSON.parse(locationData);
            } catch (e) {
                // Si no es un JSON válido, continúa con otros posibles campos
            }
        }

        if (locationData && typeof locationData === 'object') {
            lat = locationData.lat !== undefined ? locationData.lat : locationData.latitude;
            lng = locationData.lng !== undefined ? locationData.lng : locationData.longitude;
        }

        if (lat === undefined && data.lat !== undefined) lat = data.lat;
        if (lat === undefined && data.latitude !== undefined) lat = data.latitude;
        if (lng === undefined && data.lng !== undefined) lng = data.lng;
        if (lng === undefined && data.longitude !== undefined) lng = data.longitude;

        if (lat === undefined || lng === undefined || lat === null || lng === null || lat === '' || lng === '') {
            const error = new Error('Las coordenadas de ubicación (lat, lng) son obligatorias');
            error.statusCode = 400;
            throw error;
        }

        lat = Number(lat);
        lng = Number(lng);

        if (isNaN(lat) || isNaN(lng)) {
            const error = new Error('Las coordenadas (lat, lng) deben ser números válidos');
            error.statusCode = 400;
            throw error;
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            const error = new Error('Las coordenadas están fuera del rango válido (lat: -90 a 90, lng: -180 a 180)');
            error.statusCode = 400;
            throw error;
        }

        const comment = typeof data.comment === 'string' ? data.comment.trim() : '';

        // Procesar foto de avistamiento si se envió archivo o URL
        let photo_url = data.photo_url || '';

        if (files) {
            const file = (files.photo && files.photo[0]) ||
                         (files.photo_post_url && files.photo_post_url[0]) ||
                         (files.photo_url && files.photo_url[0]);
            if (file) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: 'posts/sightings',
                        transformation: [{ width: 600, height: 600, crop: 'limit' }]
                    });
                    if (result && result.secure_url) {
                        photo_url = result.secure_url;
                    }
                } catch (uploadError) {
                    console.warn('[PostService] Error al subir foto de avistamiento a Cloudinary:', uploadError.message);
                }
            }
        }

        const sighting = {
            user: userId,
            location: { lat, lng },
            comment,
            photo_url,
            createdAt: new Date()
        };

        post.sightings = post.sightings || [];
        post.sightings.push(sighting);
        await post.save();

        // Poblar datos del usuario que registró el avistamiento
        await post.populate({
            path: 'sightings.user',
            select: 'name last_name username email'
        });

        const createdSighting = post.sightings[post.sightings.length - 1];

        // Notificar al dueño de la publicación si aplica (fuera del entorno de pruebas)
        if (process.env.NODE_ENV !== 'test' && post.owner && String(post.owner) !== String(userId)) {
            notificationService.createNotifications([{
                emiter_id: userId,
                receiver_id: post.owner,
                type: 'post',
                post_id: post._id
            }]).catch(err => console.warn('[PostService] Error enviando notificación de avistamiento:', err.message));
        }

        return {
            message: 'Avistamiento registrado exitosamente',
            sighting: createdSighting,
            post
        };
    }

    async updatePost(id, updates) {
        const allowedUpdates = ['type', 'body', 'location', 'amount_reactions', 'amount_comments', 'reward', 'address'];
        const isValidOperation = Object.keys(updates).every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            const error = new Error('Invalid updates!');
            error.statusCode = 400;
            throw error;
        }

        return await Post.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    }

    async deletePost(id) {
        return await Post.findByIdAndDelete(id);
    }
}

module.exports = new PostService();
