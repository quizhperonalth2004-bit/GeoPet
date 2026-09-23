const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const adminController = require('./admin.controller');
const userController = require('../users/user.controller');
const postController = require('../posts/post.controller');

// Todas las rutas de administración están estrictamente protegidas con verifyToken y verifyAdmin
router.use(authMiddleware.verifyToken, authMiddleware.verifyAdmin);

// Métricas globales de la base de datos
router.get('/metrics', adminController.getMetrics);
router.get('/stats', adminController.getMetrics);

// Gestión de usuarios para administración
router.get('/users', userController.getUsersAll);
router.patch('/users/:id/role', userController.updateUserRole);
router.delete('/users/:id', userController.deleteUser);

// Moderación de publicaciones
router.delete('/posts/:id', postController.deletePost);

module.exports = router;
