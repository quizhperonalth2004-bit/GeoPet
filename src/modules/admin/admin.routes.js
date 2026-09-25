const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const adminController = require('./admin.controller');
const userController = require('../users/user.controller');
const postController = require('../posts/post.controller');
const { adminQueryDto, assignRoleDto, adminIdParamDto } = require('./admin.dto');

// Todas las rutas de administración están estrictamente protegidas con verifyToken y verifyAdmin
router.use(authMiddleware.verifyToken, authMiddleware.verifyAdmin);

// Métricas globales de la base de datos
router.get('/metrics', validate({ query: adminQueryDto }), adminController.getMetrics);
router.get('/stats', validate({ query: adminQueryDto }), adminController.getMetrics);

// Gestión de usuarios para administración
router.get('/users', validate({ query: adminQueryDto }), userController.getUsersAll);
router.patch('/users/:id/role', validate({ params: adminIdParamDto, body: assignRoleDto }), userController.updateUserRole);
router.delete('/users/:id', validate({ params: adminIdParamDto }), userController.deleteUser);

// Moderación de publicaciones
router.delete('/posts/:id', validate({ params: adminIdParamDto }), postController.deletePost);

module.exports = router;
