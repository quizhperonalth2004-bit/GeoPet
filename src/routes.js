const express = require('express');
const router = express.Router();

// Importar rutas de cada módulo de dominio esencial
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const profileRoutes = require('./modules/users/profile.routes');
const petRoutes = require('./modules/pets/pets.routes');
const postRoutes = require('./modules/posts/post.routes');
const reactionRoutes = require('./modules/posts/reaction.routes');
const commentRoutes = require('./modules/posts/comment.routes');
const notificationRoutes = require('./modules/posts/notification.routes');
const adminRoutes = require('./modules/admin/admin.routes');

// Función helper para montar rutas bajo /api y /api/v1 (compatibilidad total con el frontend)
const mountModuleRoutes = (baseRouter) => {
    baseRouter.use('/auth', authRoutes);
    baseRouter.use('/', authRoutes);
    baseRouter.use('/users', userRoutes);
    baseRouter.use('/profiles', profileRoutes);
    baseRouter.use('/pets', petRoutes);
    baseRouter.use('/posts', postRoutes);
    baseRouter.use('/reactions', reactionRoutes);
    baseRouter.use('/comments', commentRoutes);
    baseRouter.use('/notifications', notificationRoutes);
    baseRouter.use('/admin', adminRoutes);
};

// Rutas bajo /api/v1/...
const v1Router = express.Router();
mountModuleRoutes(v1Router);
router.use('/v1', v1Router);

// Rutas directas bajo /api/...
mountModuleRoutes(router);

module.exports = router;
