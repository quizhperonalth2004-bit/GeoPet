const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/models/user.model');
const authMiddleware = require('../../middlewares/auth.middleware');
const { twilioClient, twilioFrom } = require('../../config/twilio');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '949676830099-frgugu7f83scll83lf3mv1sjav6vshh3.apps.googleusercontent.com');

// Generador de clave aleatoria para restablecimiento
function generateRandomPassword(length = 6) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        password += chars[randomIndex];
    }
    return password;
}

class AuthService {
    async login(email, password) {
        const jwtSecret = process.env.JWT_SECRET || 'fabricio29';
        const user = await User.findOne({ email });

        if (!user) {
            const error = new Error('No existe usuario registrado con este correo electrónico.');
            error.statusCode = 404;
            throw error;
        }

        if (user.auth_provider === 'google') {
            const error = new Error('Esta cuenta fue registrada con Google. Por favor, inicia sesión con el botón de Google.');
            error.statusCode = 400;
            throw error;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const error = new Error('La contraseña proporcionada es incorrecta.');
            error.statusCode = 401;
            throw error;
        }

        // Actualizar última interacción
        user.last_interaction = new Date();
        await user.save();

        // Generar token JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email, rol: user.rol },
            jwtSecret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Adjuntar foto de perfil
        let photo = user.profile_picture || 'assets/default-avatar.png';
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const Profile = require('../users/models/profile.model');
                const profile = await Profile.findOne({ user: user._id });
                if (profile?.profile_picture || profile?.photo_profile_url) {
                    photo = profile.profile_picture || profile.photo_profile_url;
                }
            }
        } catch (profileErr) {
            // Silencioso
        }

        const userObj = user.toObject ? user.toObject() : { ...user };
        userObj.profile_picture = photo;
        userObj.photo = photo;
        userObj.photo_profile_url = photo;

        return {
            message: `¡Bienvenido, ${user.username}!`,
            token,
            user: userObj
        };
    }

    logout(token) {
        if (token) {
            authMiddleware.blacklistToken(token);
        }
        return { message: 'Logout exitoso.' };
    }

    async resetPassword(email, phone) {
        const user = await User.findOne({ email });
        if (!user) {
            const error = new Error('No existe usuario registrado con este correo electrónico.');
            error.statusCode = 404;
            throw error;
        }

        const newPassword = generateRandomPassword(6);

        // Actualizar la contraseña del usuario
        await user.updatePassword(newPassword);

        if (!phone) {
            const error = new Error('El usuario no tiene un número de teléfono registrado.');
            error.statusCode = 400;
            throw error;
        }

        const fullPhoneNumber = phone.startsWith('+') ? phone : `+593${phone}`;

        if (twilioClient) {
            try {
                await twilioClient.messages.create({
                    body: `Hola ${user.name}, tu nueva contraseña es: ${newPassword}. Por favor, cámbiala una vez que inicies sesión.`,
                    from: twilioFrom,
                    to: fullPhoneNumber
                });
                console.log('[AuthService] SMS de restablecimiento enviado a:', fullPhoneNumber);
            } catch (twilioErr) {
                console.warn('[AuthService] Error enviando SMS con Twilio:', twilioErr.message);
            }
        } else {
            console.log(`[AuthService Demo] Contraseña generada para ${user.email}: ${newPassword}`);
        }

        return { message: 'Mensaje de texto de restablecimiento de contraseña enviado con éxito.' };
    }

    async googleLogin(params) {
        const idToken = typeof params === 'string' ? params : (params?.idToken || params?.credential);
        const accessToken = typeof params === 'object' ? (params?.accessToken || params?.access_token) : null;

        if (!idToken && !accessToken) {
            const error = new Error('Token de Google no proporcionado.');
            error.statusCode = 400;
            throw error;
        }

        const audience = process.env.GOOGLE_CLIENT_ID || '949676830099-frgugu7f83scll83lf3mv1sjav6vshh3.apps.googleusercontent.com';

        let payload;

        if (idToken) {
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken,
                    audience
                });
                payload = ticket.getPayload();
            } catch (err) {
                const error = new Error('Token de Google inválido o expirado.');
                error.statusCode = 401;
                throw error;
            }
        } else if (accessToken) {
            try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (!userInfoRes.ok) {
                    const error = new Error('Token de acceso de Google inválido o expirado.');
                    error.statusCode = 401;
                    throw error;
                }
                payload = await userInfoRes.json();
            } catch (err) {
                if (err.statusCode) throw err;
                const error = new Error('Error al verificar credenciales con Google.');
                error.statusCode = 401;
                throw error;
            }
        }

        if (!payload || !payload.email) {
            const error = new Error('No se pudo obtener información del perfil de Google.');
            error.statusCode = 400;
            throw error;
        }

        const email = payload.email.toLowerCase().trim();
        const name = payload.given_name || payload.name?.split(' ')[0] || 'Usuario';
        const lastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || 'Google';
        const picture = payload.picture || '';

        // Buscar si el usuario ya existe en la base de datos
        let user = await User.findOne({ email });

        if (!user) {
            // Generar username único basado en el correo o nombre
            let baseUsername = (payload.name || email.split('@')[0])
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .slice(0, 15);
            if (!baseUsername) baseUsername = 'user';
            let uniqueUsername = baseUsername;
            let counter = 1;
            while (await User.findOne({ username: uniqueUsername })) {
                uniqueUsername = `${baseUsername}${counter}`;
                counter++;
            }

            // Generar contraseña segura aleatoria
            const randomPassword = generateRandomPassword(16);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            user = new User({
                name,
                last_name: lastName,
                username: uniqueUsername,
                email,
                password: hashedPassword,
                rol: 'usuario',
                auth_provider: 'google',
                profile_picture: picture || 'assets/default-avatar.png',
                status_profile: true,
                last_interaction: new Date()
            });
            await user.save();

            // Crear perfil asociado
            let profileDoc = null;
            try {
                const Profile = require('../users/models/profile.model');
                profileDoc = new Profile({
                    user: user._id,
                    number_phone: 0,
                    profile_picture: picture || 'assets/default-avatar.png',
                    photo_profile_url: picture || 'assets/default-avatar.png',
                    word_description: 'Amante de las mascotas 🐾',
                    description: 'Cuenta verificada con Google Sign-In'
                });
                await profileDoc.save();
            } catch (profileErr) {
                console.warn('[AuthService] No se pudo crear perfil complementario de Google:', profileErr.message);
            }
        } else {
            // Validar proveedor de autenticación
            if (user.auth_provider === 'local') {
                const error = new Error('Este correo ya está registrado con contraseña. Por favor, inicia sesión con tus credenciales habituales.');
                error.statusCode = 409;
                throw error;
            }

            // Actualizar última interacción
            user.last_interaction = new Date();
            if (picture) {
                user.profile_picture = picture;
            }
            await user.save();

            // Si el usuario YA existe en MongoDB, ACTUALIZA OBLIGATORIAMENTE el campo profile_picture y photo_profile_url
            // del documento Profile asociado con la foto de Google si la URL de Google viene presente
            try {
                const mongoose = require('mongoose');
                if (mongoose.connection.readyState === 1) {
                    const Profile = require('../users/models/profile.model');
                    profileDoc = await Profile.findOne({ user: user._id });
                    if (profileDoc) {
                        if (picture) {
                            profileDoc.photo_profile_url = picture;
                            profileDoc.profile_picture = picture;
                            await profileDoc.save();
                        }
                    } else {
                        profileDoc = new Profile({
                            user: user._id,
                            number_phone: 0,
                            profile_picture: picture || 'assets/default-avatar.png',
                            photo_profile_url: picture || 'assets/default-avatar.png',
                            word_description: 'Amante de las mascotas 🐾',
                            description: 'Cuenta verificada con Google Sign-In'
                        });
                        await profileDoc.save();
                    }
                }
            } catch (profileErr) {
                console.warn('[AuthService] Error al actualizar foto de perfil con Google:', profileErr.message);
            }
        }

        // Generar token JWT de la aplicación
        const jwtSecret = process.env.JWT_SECRET || 'fabricio29';
        const token = jwt.sign(
            { userId: user._id, email: user.email, rol: user.rol },
            jwtSecret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        if (!profileDoc) {
            try {
                const mongoose = require('mongoose');
                if (mongoose.connection.readyState === 1) {
                    const Profile = require('../users/models/profile.model');
                    profileDoc = await Profile.findOne({ user: user._id });
                }
            } catch (e) {
                // Silencioso
            }
        }

        const resolvedPhoto = profileDoc?.photo_profile_url || profileDoc?.profile_picture || picture || user.profile_picture || 'assets/default-avatar.png';

        const userObj = user.toObject ? user.toObject() : { ...user };
        userObj.photo = resolvedPhoto;
        userObj.profile_picture = resolvedPhoto;
        userObj.photo_profile_url = resolvedPhoto;

        return {
            message: `¡Bienvenido, ${user.name}!`,
            token,
            user: userObj
        };
    }
}

module.exports = new AuthService();
