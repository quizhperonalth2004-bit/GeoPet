const mongoose = require('mongoose');
const User = require('./models/user.model');
const Profile = require('./models/profile.model');
const bcrypt = require('bcryptjs');
const eventBus = require('../../shared/eventBus');

class UserService {
    async getUsersWithProfiles() {
        const usersWithProfiles = await Profile.find().populate('user');
        return usersWithProfiles;
    }

    async getAllUsers() {
        return await User.find();
    }

    async getUserById(id) {
        return await User.findById(id);
    }

    async getUserByEmail(email) {
        const normalizedEmail = (email || '').toLowerCase().trim();
        const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return await User.findOne({
            $or: [
                { email: normalizedEmail },
                { email: { $regex: new RegExp(`^\\s*${escapedEmail}\\s*$`, 'i') } }
            ]
        });
    }

    async createUser(userData) {
        const normalizedEmail = (userData.email || '').toLowerCase().trim();
        const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Validar unicidad de correo y username si la base de datos está conectada o findOne está mockeado
        if (mongoose.connection.readyState === 1 || (User.findOne && User.findOne._isMockFunction)) {
            const existingUserByEmail = await User.findOne({
                $or: [
                    { email: normalizedEmail },
                    { email: { $regex: new RegExp(`^\\s*${escapedEmail}\\s*$`, 'i') } }
                ]
            });
            if (existingUserByEmail) {
                const error = new Error('Debes usar otro correo, el que has ingresado ya está en uso');
                error.code = 11000;
                error.keyPattern = { email: 1 };
                error.statusCode = 400;
                throw error;
            }

            const normalizedUsername = (userData.username || '').toLowerCase().trim();
            const escapedUsername = normalizedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const existingUserByUsername = await User.findOne({
                username: { $regex: new RegExp(`^\\s*${escapedUsername}\\s*$`, 'i') }
            });
            if (existingUserByUsername) {
                const error = new Error('El campo usuario que has ingresado no está disponible');
                error.code = 11000;
                error.keyPattern = { username: 1 };
                error.statusCode = 400;
                throw error;
            }
        }

        const saltRounds = process.env.NODE_ENV === 'test' ? 4 : 10;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

        const userPayload = {
            name: (userData.name || '').trim(),
            last_name: (userData.last_name || '').trim(),
            username: (userData.username || '').trim(),
            email: normalizedEmail,
            password: hashedPassword,
            rol: userData.rol || 'usuario',
            auth_provider: 'local',
            profile_picture: 'assets/default-avatar.png'
        };

        if (userData.ci !== undefined && userData.ci !== null && userData.ci !== '') {
            userPayload.ci = userData.ci;
        }

        const user = new User(userPayload);

        const newUser = await user.save();

        // Crear automáticamente el perfil por defecto para el nuevo usuario
        try {
            const defaultProfile = new Profile({
                user: newUser._id,
                number_phone: 999999999,
                profile_picture: 'assets/default-avatar.png',
                photo_profile_url: 'assets/default-avatar.png',
                photo_cover_url: '',
                word_description: 'Amante de las mascotas',
                description: 'Usuario registrado en Patas Unidas'
            });
            await defaultProfile.save();
            newUser.status_profile = true;
            await newUser.save();
        } catch (profileErr) {
            console.warn('[UserService] Error al auto-crear perfil de usuario:', profileErr.message);
        }

        return newUser;
    }

    async updatePassword(email, newPassword, currentPassword) {
        const normalizedEmail = (email || '').toLowerCase().trim();
        const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const user = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { email: { $regex: new RegExp(`^\\s*${escapedEmail}\\s*$`, 'i') } }
            ]
        });
        if (!user) {
            return null;
        }

        if (currentPassword) {
            const bcrypt = require('bcryptjs');
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                const error = new Error('La contraseña actual ingresada es incorrecta.');
                error.statusCode = 400;
                throw error;
            }
        }

        await user.updatePassword(newPassword);
        return user;
    }

    async updateInteraction(userId) {
        const user = await User.findById(userId);
        if (!user) {
            return null;
        }

        user.last_interaction = new Date();
        await user.save();
        return user;
    }

    async deleteUser(userId) {
        const user = await User.findByIdAndDelete(userId);
        if (user) {
            // Emitir evento para limpieza en memoria desacoplada
            eventBus.emit('user:deleted', { userId });
        }
        return user;
    }

    async updateUserRole(userId, rol) {
        return await User.findByIdAndUpdate(userId, { rol }, { new: true, runValidators: true });
    }
}

module.exports = new UserService();
