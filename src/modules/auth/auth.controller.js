const authService = require('./auth.service');
const authMiddleware = require('../../middlewares/auth.middleware');

const authController = {
    login: async (req, res, next) => {
        const { email, password } = req.body;
        try {
            const result = await authService.login(email, password);
            res.status(200).json(result);
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            console.error('Error al iniciar sesión:', error);
            next(error);
        }
    },

    logout: (req, res) => {
        const token = req.headers.authorization;
        const result = authService.logout(token);
        res.status(200).json(result);
    },

    verifyToken: (req, res, next) => {
        return authMiddleware.verifyToken(req, res, next);
    },

    forgotPassword: async (req, res, next) => {
        const { email } = req.body;
        try {
            const result = await authService.forgotPassword(email);
            res.status(200).json(result);
        } catch (error) {
            console.error('[AuthController] Error en forgotPassword:', error);
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            next(error);
        }
    },

    resetPassword: async (req, res, next) => {
        const { email, phone, code, newPassword } = req.body;
        try {
            const result = await authService.resetPassword({ email, phone, code, newPassword });
            res.status(200).json(result);
        } catch (error) {
            console.error('[AuthController] Error al restablecer la contraseña:', error);
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            next(error);
        }
    },

    googleLogin: async (req, res, next) => {
        try {
            console.log('[GOOGLE_AUTH_DEBUG] Request body recibido en googleLogin:', JSON.stringify(req.body, null, 2));
            const result = await authService.googleLogin(req.body);
            res.status(200).json(result);
        } catch (error) {
            console.error('[GOOGLE_AUTH_DEBUG]: Error completo en googleLogin:', error.stack || error);
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            next(error);
        }
    }
};

module.exports = authController;
