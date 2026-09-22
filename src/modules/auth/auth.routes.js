const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authLimiter } = require('../../middlewares/rateLimit.middleware');

router.post('/login', authLimiter, authController.login);
router.post('/google', authController.googleLogin);
router.post('/logout', authController.logout);

// Rutas de recuperación de contraseña con soporte kebab-case y camelCase
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/forgotPassword', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/resetPassword', authLimiter, authController.resetPassword);

// Aliases para prevenir 404 en caso de duplicación de prefijo /auth en clientes
router.post('/auth/forgot-password', authLimiter, authController.forgotPassword);
router.post('/auth/forgotPassword', authLimiter, authController.forgotPassword);
router.post('/auth/reset-password', authLimiter, authController.resetPassword);
router.post('/auth/resetPassword', authLimiter, authController.resetPassword);

module.exports = router;
