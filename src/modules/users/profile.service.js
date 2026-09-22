const Profile = require('./models/profile.model');
const User = require('./models/user.model');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

class ProfileService {
    async createProfile(data, files) {
        const user = await User.findById(data.user);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        let profileImageUrl = '';
        if (files && files.photo_profile && files.photo_profile.length > 0) {
            const filePath = files.photo_profile[0].path;
            try {
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: 'profiles',
                    transformation: [{ width: 300, height: 300, crop: 'fill' }]
                });
                if (result && result.secure_url) {
                    profileImageUrl = result.secure_url;
                }
            } catch (err) {
                console.warn('[ProfileService] Error al subir foto de perfil a Cloudinary:', err.message);
            } finally {
                try {
                    await fs.promises.unlink(filePath);
                } catch (unlinkErr) {
                    if (unlinkErr.code !== 'ENOENT') {
                        console.warn('[ProfileService] Error al eliminar foto de perfil temporal:', unlinkErr.message);
                    }
                }
            }
        }

        let coverImageUrl = '';
        if (files && files.photo_cover && files.photo_cover.length > 0) {
            const filePath = files.photo_cover[0].path;
            try {
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: 'covers',
                    transformation: [{ width: 1200, height: 300, crop: 'fill' }]
                });
                if (result && result.secure_url) {
                    coverImageUrl = result.secure_url;
                }
            } catch (err) {
                console.warn('[ProfileService] Error al subir foto de portada a Cloudinary:', err.message);
            } finally {
                try {
                    await fs.promises.unlink(filePath);
                } catch (unlinkErr) {
                    if (unlinkErr.code !== 'ENOENT') {
                        console.warn('[ProfileService] Error al eliminar foto de portada temporal:', unlinkErr.message);
                    }
                }
            }
        }

        if (!profileImageUrl) {
            const error = new Error('La imagen de perfil es requerida');
            error.statusCode = 400;
            throw error;
        }

        const profileData = {
            ...data,
            photo_profile_url: profileImageUrl,
            photo_cover_url: coverImageUrl
        };

        const profile = new Profile(profileData);
        user.status_profile = true;
        await user.save();
        await profile.save();

        return { profile, user };
    }

    async getProfiles() {
        return await Profile.find({});
    }

    async getProfileByUserId(userId) {
        const user = await User.findById(userId);
        if (!user) {
            return null;
        }

        let profile = await Profile.findOne({ user: user._id });
        if (!profile) {
            try {
                profile = new Profile({
                    user: user._id,
                    number_phone: 999999999,
                    profile_picture: user.profile_picture || 'assets/default-avatar.png',
                    photo_profile_url: user.profile_picture || 'assets/default-avatar.png',
                    photo_cover_url: '',
                    word_description: 'Amante de las mascotas',
                    description: 'Usuario registrado en Patas Unidas'
                });
                await profile.save();
                user.status_profile = true;
                await user.save();
            } catch (createErr) {
                console.warn('[ProfileService] Error al auto-crear perfil en getProfileByUserId:', createErr.message);
            }
        }

        const finalPhoto = profile?.photo_profile_url || profile?.profile_picture || user.profile_picture || 'assets/default-avatar.png';
        const profileObj = profile ? (profile.toObject ? profile.toObject() : profile) : {};
        const userObj = user.toObject ? user.toObject() : { ...user };
        
        profileObj.photo = finalPhoto;
        profileObj.profile_picture = finalPhoto;
        profileObj.photo_profile_url = finalPhoto;

        userObj.photo = finalPhoto;
        userObj.profile_picture = finalPhoto;
        userObj.photo_profile_url = finalPhoto;

        return {
            profile: profileObj,
            user: userObj,
            photo: finalPhoto,
            profile_picture: finalPhoto,
            photo_profile_url: finalPhoto,
            ...userObj
        };
    }

    async getProfileById(profileId) {
        const profile = await Profile.findById(profileId).populate('user');
        if (!profile) return null;
        const profileObj = profile.toObject ? profile.toObject() : profile;
        const finalPhoto = profile.photo_profile_url || profile.profile_picture || 'assets/default-avatar.png';
        profileObj.photo = finalPhoto;
        profileObj.profile_picture = finalPhoto;
        profileObj.photo_profile_url = finalPhoto;
        if (profileObj.user) {
            profileObj.user.photo = finalPhoto;
            profileObj.user.profile_picture = finalPhoto;
            profileObj.user.photo_profile_url = finalPhoto;
        }
        return profileObj;
    }

    async updateProfile(id, body) {
        let profile = await Profile.findById(id);
        if (!profile) {
            profile = await Profile.findOne({ user: id });
        }
        if (!profile) return null;

        // Extraer la foto de profile_picture, photo o photo_profile_url
        const incomingPhoto = body.profile_picture ?? body.photo ?? body.photo_profile_url;

        // Si la petición NO envía una nueva foto (o viene null, undefined o string vacío ""),
        // CONSERVAR la foto actual del usuario en la base de datos en lugar de sobreescribirla con vacío.
        if (typeof incomingPhoto === 'string' && incomingPhoto.trim() !== '') {
            profile.profile_picture = incomingPhoto.trim();
            profile.photo_profile_url = incomingPhoto.trim();
        } else if (!profile.profile_picture) {
            profile.profile_picture = profile.photo_profile_url || 'assets/default-avatar.png';
        }

        if (body.photo_cover_url && typeof body.photo_cover_url === 'string' && body.photo_cover_url.trim() !== '') {
            profile.photo_cover_url = body.photo_cover_url;
        }
        if (body.number_phone !== undefined && body.number_phone !== null && body.number_phone !== '') {
            profile.number_phone = Number(body.number_phone) || 0;
        }
        if (body.description !== undefined && body.description !== null) {
            profile.description = body.description;
        }
        if (body.word_description !== undefined && body.word_description !== null) {
            profile.word_description = body.word_description;
        }
        if (body.notifications && Array.isArray(body.notifications)) {
            profile.notifications.push(...body.notifications);
        }

        await profile.save();

        // Si se enviaron datos del usuario (name, last_name, email), actualizarlos en User
        let updatedUserDoc = null;
        if (profile.user) {
            const User = require('./models/user.model');
            const user = await User.findById(profile.user);
            if (user) {
                if (body.name && typeof body.name === 'string' && body.name.trim()) {
                    user.name = body.name.trim();
                }
                if (body.last_name && typeof body.last_name === 'string' && body.last_name.trim()) {
                    user.last_name = body.last_name.trim();
                }
                if (body.email && typeof body.email === 'string' && body.email.trim()) {
                    user.email = body.email.trim();
                }
                // Conservar o actualizar foto en User
                if (typeof incomingPhoto === 'string' && incomingPhoto.trim() !== '') {
                    user.profile_picture = incomingPhoto.trim();
                } else if (!user.profile_picture) {
                    user.profile_picture = profile.profile_picture || 'assets/default-avatar.png';
                }
                await user.save();
                updatedUserDoc = user;
            }
        }

        const populatedProfile = await Profile.findById(profile._id).populate('user');
        const finalPhoto = profile.photo_profile_url || profile.profile_picture || 'assets/default-avatar.png';

        const userObj = updatedUserDoc
            ? updatedUserDoc.toObject()
            : (populatedProfile.user && typeof populatedProfile.user.toObject === 'function' ? populatedProfile.user.toObject() : {});

        userObj.photo = finalPhoto;
        userObj.profile_picture = finalPhoto;
        userObj.photo_profile_url = finalPhoto;

        const profileObj = populatedProfile.toObject ? populatedProfile.toObject() : populatedProfile;
        profileObj.photo = finalPhoto;
        profileObj.profile_picture = finalPhoto;
        profileObj.photo_profile_url = finalPhoto;

        return {
            profile: profileObj,
            user: userObj,
            photo: finalPhoto,
            profile_picture: finalPhoto,
            photo_profile_url: finalPhoto,
            ...userObj
        };
    }

    async deleteProfile(profileId) {
        return await Profile.findByIdAndDelete(profileId);
    }
}

module.exports = new ProfileService();
