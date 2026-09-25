const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const blacklistedTokens = new Set();

const authMiddleware = {
    /**
     * Middleware para verificar la validez del token JWT y que no esté en la lista negra
     */
    verifyToken: (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: 'Acceso no autorizado: Token no proporcionado.' });
        }

        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

        if (blacklistedTokens.has(token) || blacklistedTokens.has(authHeader)) {
            return res.status(401).json({ message: 'Token inválido o expirado por cierre de sesión.' });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('[AuthMiddleware] Error crítico de seguridad: JWT_SECRET no está configurado en las variables de entorno.');
            return res.status(500).json({ message: 'Error interno de configuración de seguridad del servidor.' });
        }

        try {
            const decoded = jwt.verify(token, jwtSecret);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Token inválido o expirado.', error: error.message });
        }
    },

    /**
     * Añade un token a la lista negra (logout)
     */
    blacklistToken: (token) => {
        if (token) {
            blacklistedTokens.add(token);
        }
    },

    /**
     * Verifica si un token está en la lista negra
     */
    isTokenBlacklisted: (token) => {
        return blacklistedTokens.has(token);
    },

    /**
     * Middleware para verificar que el usuario tenga rol de administrador ('admin')
     * Responde con HTTP 403 Forbidden si el rol no es admin
     */
    verifyAdmin: async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Acceso no autorizado: Se requiere autenticación previa.' });
        }

        let role = req.user.rol || req.user.role;

        // Si el token no tiene el rol 'admin', consultar en BD para validar permisos en tiempo real (si hay conexión activa)
        if (role !== 'admin' && req.user.userId && mongoose.connection.readyState === 1) {
            try {
                const User = require('../modules/users/models/user.model');
                const userDoc = await User.findById(req.user.userId).select('rol');
                if (userDoc) {
                    role = userDoc.rol;
                    req.user.rol = userDoc.rol;
                }
            } catch (err) {
                // Continuar con el rol del token
            }
        }

        if (role !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado: Se requieren permisos de administrador.' });
        }

        next();
    },

    /**
     * Middleware para verificar moderación o propiedad:
     * Permite la acción si req.user.rol === 'admin' o si el usuario es el dueño del post.
     */
    verifyAdminOrOwner: async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Acceso no autorizado: Se requiere autenticación previa.' });
        }

        const role = req.user.rol || req.user.role;
        if (role === 'admin') {
            return next();
        }

        // Si no es admin, verificar si es el dueño de la publicación
        try {
            const Post = require('../modules/posts/post.model');
            const post = await Post.findById(req.params.id);
            if (!post) {
                return res.status(404).json({ error: 'Publicación no encontrada.' });
            }

            const currentUserId = String(req.user.userId || req.user._id || req.user.id);
            const postOwnerId = String(post.owner?._id || post.owner);

            if (currentUserId === postOwnerId) {
                return next();
            }

            return res.status(403).json({ message: 'Acceso denegado: Se requieren permisos de administrador o ser propietario de la publicación.' });
        } catch (error) {
            return res.status(500).json({ message: 'Error al verificar permisos.', error: error.message });
        }
    }
};

// Alias para compatibilidad
authMiddleware.isAdmin = authMiddleware.verifyAdmin;

module.exports = authMiddleware;
