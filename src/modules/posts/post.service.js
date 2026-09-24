const mongoose = require('mongoose');
const fs = require('fs');
const Post = require('./post.model');
const User = require('../users/models/user.model');
const Profile = require('../users/models/profile.model');
const Pet = require('../pets/models/pet.model');
const cloudinary = require('../../config/cloudinary');
const notificationService = require('../notifications/notification.service');
const eventBus = require('../../shared/eventBus');
const { BadRequestError, NotFoundError, UnauthorizedError } = require('../../shared/errors');

class PostService {
    /**
     * @param {Object} [dependencies] Inyección de dependencias para modelos y servicios externos
     */
    constructor(dependencies = {}) {
        this.postModel = dependencies.postModel || Post;
        this.userModel = dependencies.userModel || User;
        this.profileModel = dependencies.profileModel || Profile;
        this.petModel = dependencies.petModel || Pet;
        this.cloudinaryUploader = dependencies.cloudinaryUploader || cloudinary.uploader;
        this.notificationService = dependencies.notificationService || notificationService;
        this.eventBus = dependencies.eventBus || eventBus;
    }

    async fetchOwnerData(ownerId) {
        if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
            return {
                profile: { photo_profile_url: 'assets/dogs/perroLogin.jpg', number_phone: '' },
                user: { name: 'Comunidad', last_name: 'Patas Unidas' }
            };
        }

        try {
            const user = await this.userModel.findById(ownerId);
            const profile = await this.profileModel.findOne({ user: ownerId });

            return {
                profile: profile ? (profile.toObject ? profile.toObject() : profile) : { photo_profile_url: 'assets/dogs/perroLogin.jpg', number_phone: '' },
                user: user ? (user.toObject ? user.toObject() : user) : { name: 'Comunidad', last_name: 'Patas Unidas' }
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
            const pet = await this.petModel.findById(petId);
            return pet ? (pet.toObject ? pet.toObject() : pet) : null;
        } catch (error) {
            return null;
        }
    }

    async createPost(data, files) {
        let { type, status, body, coordinates, reward, owner, pet, address } = data;
        let photo_url = '';

        // Normalizar type y status (soporta 'perdido', 'avistamiento', 'Perdida', 'Avistamiento', etc.)
        const rawType = String(type || status || '').trim().toLowerCase();
        if (rawType.startsWith('avis')) {
            type = 'Avistamiento';
            status = 'avistamiento';
        } else if (rawType.startsWith('perd')) {
            type = 'Perdida';
            status = 'perdido';
        } else if (rawType.startsWith('encon')) {
            type = 'Encontrado';
            status = 'encontrado';
        } else if (rawType.startsWith('adop')) {
            type = 'Adopcion';
            status = 'adopcion';
        }

        switch (type) {
            case 'Perdida':
                if (!coordinates) {
                    throw new BadRequestError('Las coordenadas son requeridas para este tipo de publicación');
                }
                break;
            case 'Avistamiento':
                if (!coordinates) {
                    coordinates = [-79.20422, -3.99313];
                }
                break;
            case 'Adopcion':
                // Estándar GeoJSON y 2dsphere estricto: [longitud, latitud]
                coordinates = [-79.20786376590335, -3.995008843716655];
                break;
            default:
                throw new BadRequestError('Tipo de publicación no válido');
        }

        let parsedCoordinates = [];
        if (typeof coordinates === 'string') {
            try {
                parsedCoordinates = JSON.parse(coordinates);
            } catch (error) {
                throw new BadRequestError('Las coordenadas tienen un formato incorrecto');
            }
        } else if (Array.isArray(coordinates)) {
            parsedCoordinates = coordinates;
        }

        // Validación y normalización estricta de orden GeoJSON: [longitud, latitud]
        if (Array.isArray(parsedCoordinates) && parsedCoordinates.length >= 2) {
            let lon = Number(parsedCoordinates[0]);
            let lat = Number(parsedCoordinates[1]);
            // Si vino invertido [lat, lon] accidentalmente (latitud en [-90, 90] y longitud en [-180, -90] o [90, 180])
            if (Math.abs(lon) <= 90 && Math.abs(lat) > 90) {
                parsedCoordinates = [lat, lon];
            } else {
                parsedCoordinates = [lon, lat];
            }
        }

        if (files && files.photo_post_url && files.photo_post_url.length > 0) {
            const filePath = files.photo_post_url[0].path;
            try {
                const result = await this.cloudinaryUploader.upload(filePath, {
                    folder: 'posts',
                    transformation: [{ width: 300, height: 300, crop: 'fill' }]
                });
                if (result && result.secure_url) {
                    photo_url = result.secure_url;
                }
            } catch (error) {
                console.warn('[PostService] Error al subir foto de publicación a Cloudinary:', error.message);
            } finally {
                // Limpieza garantizada del archivo temporal local de Multer
                try {
                    await fs.promises.unlink(filePath);
                } catch (unlinkErr) {
                    if (unlinkErr.code !== 'ENOENT') {
                        console.warn('[PostService] Error al eliminar archivo temporal local:', unlinkErr.message);
                    }
                }
            }
        }

        if (!photo_url && data.photo_post_url && typeof data.photo_post_url === 'string') {
            photo_url = data.photo_post_url;
        }

        const newPost = new this.postModel({
            type,
            status: status || (type === 'Avistamiento' ? 'avistamiento' : 'perdido'),
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
        this.notificationService.broadcastNotification({
            type: 'post',
            emitterId: owner,
            itemId: savedPost._id,
            itemField: 'post_id'
        }).catch(err => console.warn('[PostService] Error enviando broadcast de post:', err.message));

        this.eventBus.emit('post:created', { post: savedPost, owner });

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
            const profileByUser = await this.profileModel.findOne({ user: ownerId });
            if (profileByUser) {
                ownerIds.push(profileByUser._id);
            }

            // Buscar si existe un usuario para este owner (en caso de que owner sea Profile ID)
            const profileAsOwner = await this.profileModel.findById(ownerId);
            if (profileAsOwner && profileAsOwner.user) {
                ownerIds.push(profileAsOwner.user);
            }

            const posts = await this.postModel.find({ owner: { $in: ownerIds } }).sort({ createdAt: -1 });
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

    async getPost(queryFilter = {}) {
        let filter = {};
        const rawType = String(queryFilter.type || queryFilter.status || '').trim().toLowerCase();
        if (rawType) {
            if (rawType.startsWith('avis')) {
                filter = { $or: [{ type: 'Avistamiento' }, { status: 'avistamiento' }] };
            } else if (rawType.startsWith('perd')) {
                filter = { $or: [{ type: 'Perdida' }, { status: 'perdido' }] };
            } else if (rawType.startsWith('encon')) {
                filter = { $or: [{ type: 'Encontrado' }, { status: 'encontrado' }] };
            } else if (rawType.startsWith('adop')) {
                filter = { $or: [{ type: 'Adopcion' }, { status: 'adopcion' }] };
            } else {
                filter = { $or: [{ type: new RegExp(rawType, 'i') }, { status: new RegExp(rawType, 'i') }] };
            }
        }

        const limit = Math.min(Math.max(parseInt(queryFilter.limit, 10) || 50, 1), 100);
        const page = Math.max(parseInt(queryFilter.page, 10) || 1, 1);
        const skip = (page - 1) * limit;

        const query = this.postModel.find(filter)
            .populate({
                path: 'owner',
                select: 'name last_name username email profile_picture'
            })
            .populate({
                path: 'pet',
                select: 'name breed sex age photo_url'
            })
            .populate({
                path: 'sightings.user',
                select: 'name last_name username email profile_picture'
            })
            .sort({ createdAt: -1 });

        if (typeof query.skip === 'function') {
            query.skip(skip);
        }
        if (typeof query.limit === 'function') {
            query.limit(limit);
        }

        const posts = await query;

        if (!posts) return [];

        return posts.map((post) => {
            const postObj = post.toObject ? post.toObject() : { ...post };

            const ownerObj = postObj.owner && typeof postObj.owner === 'object' ? postObj.owner : null;
            const petObj = postObj.pet && typeof postObj.pet === 'object' ? postObj.pet : null;

            const firstName = ownerObj?.name || 'Comunidad';
            const lastName = ownerObj?.last_name || 'GeoPet';
            const profilePhoto = ownerObj?.profile_picture || 'assets/default-avatar.png';

            const petPhoto = postObj.photo_post_url || petObj?.photo_url || 'assets/dogs/perroLogin.jpg';

            return {
                ...postObj,
                firstName,
                lastName,
                profilePhoto,
                petPhoto,
                userDetails: {
                    name: `${firstName} ${lastName}`.trim(),
                    photo: profilePhoto,
                    phone: ''
                },
                petDetails: petObj ? {
                    name: petObj.name,
                    breed: petObj.breed,
                    sex: petObj.sex,
                    age: petObj.age,
                    photo_url: petObj.photo_url
                } : null
            };
        });
    }

    async getPostsAll() {
        return await this.postModel.find();
    }

    async getPostsAllByUser(userId) {
        return await this.postModel.find({ owner: userId });
    }

    async getPostById(id) {
        const post = await this.postModel.findById(id).populate({
            path: 'sightings.user',
            select: 'name last_name username email profile_picture'
        });
        if (!post) {
            return null;
        }

        const [ownerData, petData] = await Promise.all([
            this.fetchOwnerData(post.owner),
            this.fetchPetData(post.pet)
        ]);

        const postObj = post.toObject ? post.toObject() : { ...post };

        return {
            ...postObj,
            firstName: ownerData.user.name,
            lastName: ownerData.user.last_name,
            profilePhoto: ownerData.profile.photo_profile_url || 'assets/dogs/perroLogin.jpg',
            phoneNumber: ownerData.profile.number_phone,
            petPhoto: post.photo_post_url || (petData ? petData.photo_url : 'assets/dogs/perroLogin.jpg'),
            userDetails: {
                name: `${ownerData.user.name} ${ownerData.user.last_name}`,
                photo: ownerData.profile.photo_profile_url || 'assets/dogs/perroLogin.jpg',
                phone: ownerData.profile.number_phone
            },
            petDetails: petData
        };
    }

    async addSighting(postId, data, user, files) {
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            throw new BadRequestError('ID de publicación no válido');
        }

        const post = await this.postModel.findById(postId);
        if (!post) {
            throw new NotFoundError('Publicación no encontrada');
        }

        const userId = user?.userId || user?.id || user?._id;
        if (!userId) {
            throw new UnauthorizedError('Usuario no autenticado');
        }

        // Validar que el creador de la publicación no registre avistamientos sobre su propio post
        const postAuthorId = post.owner?._id || post.owner || post.user?._id || post.user;
        if (postAuthorId && String(postAuthorId) === String(userId)) {
            throw new BadRequestError('No puedes registrar un avistamiento sobre tu propia publicación.');
        }

        // Validar que la publicación no esté marcada como encontrado / resuelto
        const currentStatus = String(post.status || post.type || '').trim().toLowerCase();
        if (currentStatus === 'encontrado' || currentStatus === 'found' || currentStatus.startsWith('encon')) {
            throw new BadRequestError('Este caso ya fue cerrado como encontrado. No se pueden agregar más avistamientos.');
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
            throw new BadRequestError('Las coordenadas de ubicación (lat, lng) son obligatorias');
        }

        lat = Number(lat);
        lng = Number(lng);

        if (isNaN(lat) || isNaN(lng)) {
            throw new BadRequestError('Las coordenadas (lat, lng) deben ser números válidos');
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new BadRequestError('Las coordenadas están fuera del rango válido (lat: -90 a 90, lng: -180 a 180)');
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
                    const result = await this.cloudinaryUploader.upload(file.path, {
                        folder: 'posts/sightings',
                        transformation: [{ width: 600, height: 600, crop: 'limit' }]
                    });
                    if (result && result.secure_url) {
                        photo_url = result.secure_url;
                    }
                } catch (uploadError) {
                    console.warn('[PostService] Error al subir foto de avistamiento a Cloudinary:', uploadError.message);
                } finally {
                    // Limpieza garantizada del archivo temporal local de avistamiento
                    try {
                        await fs.promises.unlink(file.path);
                    } catch (unlinkErr) {
                        if (unlinkErr.code !== 'ENOENT') {
                            console.warn('[PostService] Error al eliminar archivo temporal de avistamiento:', unlinkErr.message);
                        }
                    }
                }
            }
        }

        const sighting = {
            post: post._id,
            post_id: post._id,
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
            select: 'name last_name username email profile_picture'
        });

        const createdSighting = post.sightings[post.sightings.length - 1];

        // Notificar al dueño de la publicación si aplica (fuera del entorno de pruebas)
        if (process.env.NODE_ENV !== 'test' && post.owner && String(post.owner) !== String(userId)) {
            this.notificationService.createNotifications([{
                emiter_id: userId,
                receiver_id: post.owner,
                type: 'post',
                post_id: post._id
            }]).catch(err => console.warn('[PostService] Error enviando notificación de avistamiento:', err.message));
        }

        return {
            message: 'Avistamiento registrado exitosamente',
            sighting: createdSighting,
            sightings: post.sightings,
            post
        };
    }

    async updatePost(id, updates) {
        const allowedUpdates = ['type', 'status', 'body', 'location', 'amount_comments', 'reward', 'address'];
        const isValidOperation = Object.keys(updates).every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            throw new BadRequestError('Invalid updates!');
        }

        if (updates.type || updates.status) {
            const raw = String(updates.type || updates.status || '').trim().toLowerCase();
            if (raw.startsWith('avis')) {
                updates.type = 'Avistamiento';
                updates.status = 'avistamiento';
            } else if (raw.startsWith('perd')) {
                updates.type = 'Perdida';
                updates.status = 'perdido';
            } else if (raw.startsWith('encon')) {
                updates.type = 'Encontrado';
                updates.status = 'encontrado';
            } else if (raw.startsWith('adop')) {
                updates.type = 'Adopcion';
                updates.status = 'adopcion';
            }
        }

        return await this.postModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    }

    async deletePost(id) {
        return await this.postModel.findByIdAndDelete(id);
    }
}

const postService = new PostService();
module.exports = postService;
module.exports.PostService = PostService;
