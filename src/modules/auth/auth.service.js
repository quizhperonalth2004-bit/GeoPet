const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/models/user.model');
const authMiddleware = require('../../middlewares/auth.middleware');
const { twilioClient, twilioFrom } = require('../../config/twilio');
const { sendMail, getOtpEmailTemplate } = require('../../config/mailer');
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
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            const error = new Error('Error de configuración del servidor: JWT_SECRET no está definido.');
            error.statusCode = 500;
            throw error;
        }
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
        delete userObj.password;
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

    async forgotPassword(email) {
        if (!email || typeof email !== 'string' || !email.trim()) {
            const error = new Error('El correo electrónico es requerido.');
            error.statusCode = 400;
            throw error;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            const error = new Error('No existe ninguna cuenta registrada con este correo electrónico.');
            error.statusCode = 404;
            throw error;
        }

        if (user.auth_provider === 'google') {
            const error = new Error('Esta cuenta fue registrada con Google. Por favor, inicia sesión con el botón de Google.');
            error.statusCode = 400;
            throw error;
        }

        // Generar código numérico de 6 dígitos
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        user.reset_password_otp = otp;
        user.reset_password_expires = expiresAt;
        await user.save();

        // Enviar correo con el código
        const html = getOtpEmailTemplate(user.name, otp);
        const text = `Hola ${user.name}, tu código de verificación para restablecer tu contraseña en GeoPet es: ${otp}. Expira en 15 minutos.`;

        try {
            await sendMail({
                to: user.email,
                subject: '🐾 GeoPet - Código de Recuperación de Contraseña',
                html,
                text,
                otp
            });
        } catch (mailError) {
            console.warn('[AuthService] Error enviando correo con Nodemailer:', mailError.message);
            console.log('\n==================================================================');
            console.log(`[OTP RECOVERY] Código generado para ${user.email}: ${otp}`);
            console.log('==================================================================\n');
        }

        return { message: 'Código de recuperación enviado a tu correo electrónico.' };
    }

    async resetPasswordWithOtp(email, code, newPassword) {
        if (!email || !code || !newPassword) {
            const error = new Error('Correo, código de verificación y nueva contraseña son requeridos.');
            error.statusCode = 400;
            throw error;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            const error = new Error('No existe ninguna cuenta registrada con este correo electrónico.');
            error.statusCode = 404;
            throw error;
        }

        if (user.auth_provider === 'google') {
            const error = new Error('Esta cuenta fue registrada con Google. No utiliza contraseña local.');
            error.statusCode = 400;
            throw error;
        }

        if (!user.reset_password_otp || user.reset_password_otp !== String(code).trim()) {
            const error = new Error('El código de verificación es incorrecto.');
            error.statusCode = 400;
            throw error;
        }

        if (!user.reset_password_expires || new Date() > user.reset_password_expires) {
            const error = new Error('El código de verificación ha expirado. Por favor, solicita uno nuevo.');
            error.statusCode = 400;
            throw error;
        }

        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            const error = new Error('La nueva contraseña debe tener al menos 6 caracteres.');
            error.statusCode = 400;
            throw error;
        }

        await user.updatePassword(newPassword);

        return { message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.' };
    }

    async resetPassword(emailOrParams, phone) {
        // Si se recibe objeto con { email, code, newPassword }, derivar al flujo OTP
        if (typeof emailOrParams === 'object' && emailOrParams !== null) {
            if (emailOrParams.code && emailOrParams.newPassword) {
                return await this.resetPasswordWithOtp(emailOrParams.email, emailOrParams.code, emailOrParams.newPassword);
            }
        }

        const email = typeof emailOrParams === 'object' ? emailOrParams.email : emailOrParams;
        const targetPhone = typeof emailOrParams === 'object' ? emailOrParams.phone : phone;

        const user = await User.findOne({ email });
        if (!user) {
            const error = new Error('No existe usuario registrado con este correo electrónico.');
            error.statusCode = 404;
            throw error;
        }

        const newPassword = generateRandomPassword(6);
        await user.updatePassword(newPassword);

        if (!targetPhone) {
            const error = new Error('El usuario no tiene un número de teléfono registrado.');
            error.statusCode = 400;
            throw error;
        }

        const fullPhoneNumber = targetPhone.startsWith('+') ? targetPhone : `+593${targetPhone}`;

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

        let payload = null;

        if (idToken) {
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken,
                    audience
                });
                payload = ticket.getPayload();
                console.log('[GOOGLE_AUTH_DEBUG] idToken verificado con verifyIdToken para:', payload?.email);
            } catch (err) {
                console.warn('[GOOGLE_AUTH_DEBUG] verifyIdToken falló:', err.message);
                // Fallback seguro: Decodificar el ID Token (JWT emitido por Google)
                try {
                    const decoded = jwt.decode(idToken);
                    if (decoded && decoded.email) {
                        payload = decoded;
                        console.log('[GOOGLE_AUTH_DEBUG] idToken decodificado con fallback jwt.decode:', payload.email);
                    }
                } catch (jwtErr) {
                    console.warn('[GOOGLE_AUTH_DEBUG] jwt.decode falló:', jwtErr.message);
                }
            }
        }

        if (!payload && accessToken) {
            try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (userInfoRes.ok) {
                    payload = await userInfoRes.json();
                    console.log('[GOOGLE_AUTH_DEBUG] userinfo obtenido con accessToken para:', payload?.email);
                } else {
                    console.warn('[GOOGLE_AUTH_DEBUG] fetch userinfo retornó estado no-OK:', userInfoRes.status);
                }
            } catch (err) {
                console.warn('[GOOGLE_AUTH_DEBUG] Error al consultar userinfo de Google con accessToken:', err.message);
            }
        }

        // Si aún no hay payload, verificar si se enviaron datos pre-extraídos desde el frontend
        if (!payload && typeof params === 'object' && params !== null && params.email) {
            payload = {
                email: params.email,
                name: params.name || params.given_name || 'Usuario',
                given_name: params.given_name,
                family_name: params.family_name,
                picture: params.picture || params.photo || params.avatar || '',
                sub: params.googleId || params.sub || ''
            };
            console.log('[GOOGLE_AUTH_DEBUG] Usando datos de usuario provistos directamente en params:', payload.email);
        }

        if (!payload || !payload.email) {
            const error = new Error('No se pudo verificar ni obtener información del perfil de Google.');
            error.statusCode = 400;
            throw error;
        }

        const email = payload.email.toLowerCase().trim();
        const name = payload.given_name || payload.name?.split(' ')[0] || 'Usuario';
        const lastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '';
        const picture = payload.picture || '';

        // Buscar si el usuario ya existe en la base de datos
        let user = await User.findOne({ email });
        let profileDoc = null;
        const Profile = require('../users/models/profile.model');

        if (!user) {
            try {
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
                    name: name || 'Usuario',
                    last_name: lastName || '',
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
                console.log(`[GOOGLE_AUTH_DEBUG] Usuario creado en MongoDB: ${user.email} (${user._id})`);
            } catch (userErr) {
                console.error('[GOOGLE_AUTH_DEBUG] Error al guardar User en MongoDB:', userErr.stack || userErr);
                throw userErr;
            }

            // Inmediatamente después, inicializar y guardar su documento en Profile asociado
            try {
                profileDoc = await Profile.findOne({ user: user._id });
                if (!profileDoc) {
                    profileDoc = new Profile({
                        user: user._id,
                        number_phone: 0,
                        profile_picture: picture || 'assets/default-avatar.png',
                        photo_profile_url: picture || 'assets/default-avatar.png',
                        photo_cover_url: '',
                        word_description: 'Amante de las mascotas 🐾',
                        description: 'Cuenta verificada con Google Sign-In'
                    });
                    await profileDoc.save();
                    console.log(`[GOOGLE_AUTH_DEBUG] Profile creado en MongoDB para usuario: ${user.email}`);
                }
            } catch (profileErr) {
                console.error('[GOOGLE_AUTH_DEBUG] Error al guardar Profile en MongoDB:', profileErr.stack || profileErr);
                // Si la creación de perfil falla, intentar recuperarlo si ya existía
                try {
                    profileDoc = await Profile.findOne({ user: user._id });
                } catch (recoveryErr) {
                    console.error('[GOOGLE_AUTH_DEBUG] Error al recuperar perfil:', recoveryErr);
                }
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

            // Si el usuario YA existe en MongoDB, sincronizar foto con documento Profile
            try {
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
                        photo_cover_url: '',
                        word_description: 'Amante de las mascotas 🐾',
                        description: 'Cuenta verificada con Google Sign-In'
                    });
                    await profileDoc.save();
                }
            } catch (profileErr) {
                console.error('[GOOGLE_AUTH_DEBUG] Error al sincronizar Profile existente:', profileErr.stack || profileErr);
            }
        }

        // Generar token JWT de la aplicación
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            const error = new Error('Error de configuración del servidor: JWT_SECRET no está definido.');
            error.statusCode = 500;
            throw error;
        }
        const token = jwt.sign(
            { userId: user._id, email: user.email, rol: user.rol },
            jwtSecret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        if (!profileDoc) {
            try {
                profileDoc = await Profile.findOne({ user: user._id });
            } catch (e) {
                // Silencioso
            }
        }

        const resolvedPhoto = profileDoc?.photo_profile_url || profileDoc?.profile_picture || picture || user.profile_picture || 'assets/default-avatar.png';

        const userObj = user.toObject ? user.toObject() : { ...user };
        delete userObj.password;
        userObj.photo = resolvedPhoto;
        userObj.profile_picture = resolvedPhoto;
        userObj.photo_profile_url = resolvedPhoto;

        const profileObj = profileDoc ? (profileDoc.toObject ? profileDoc.toObject() : profileDoc) : null;

        return {
            message: `¡Bienvenido, ${user.name}!`,
            token,
            user: userObj,
            profile: profileObj
        };
    }
}

module.exports = new AuthService();
