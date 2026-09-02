const authService = require('./auth.service');
const authMiddleware = require('../../middlewares/auth.middleware');

const authController = {
    login: async (req, res) => {
        const { email, password } = req.body;
        try {
            const result = await authService.login(email, password);
            res.status(200).json(result);
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            console.error('Error al iniciar sesión:', error);
            res.status(500).json({ message: 'Ha ocurrido un error al iniciar sesión.' });
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

    resetPassword: async (req, res) => {
        const { email, phone } = req.body;
        try {
            const result = await authService.resetPassword(email, phone);
            res.status(200).json(result);
        } catch (error) {
            console.error('Error al restablecer la contraseña:', error);
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            res.status(500).json({ message: 'Hubo un error al intentar restablecer la contraseña. Por favor, inténtalo de nuevo más tarde.' });
        }
    },

    googleLogin: async (req, res) => {
        const idToken = req.body.idToken || req.body.credential || req.body.token;
        const accessToken = req.body.accessToken || req.body.access_token;
        try {
            const result = await authService.googleLogin({ idToken, accessToken });
            res.status(200).json(result);
        } catch (error) {
            console.error('[AuthController] Error en googleLogin:', error);
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            res.status(500).json({ message: 'Error interno al autenticar con Google.', error: error.message });
        }
    }
};

module.exports = authController;
