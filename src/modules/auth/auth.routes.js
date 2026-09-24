const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authLimiter } = require('../../middlewares/rateLimit.middleware');
const validate = require('../../middlewares/validate.middleware');
const { loginDto, googleLoginDto, forgotPasswordDto, resetPasswordDto } = require('./auth.dto');

router.post('/login', authLimiter, validate(loginDto), authController.login);
router.post('/google', validate(googleLoginDto), authController.googleLogin);
router.post('/logout', authController.logout);

// Rutas de recuperación de contraseña con soporte kebab-case y camelCase
router.post('/forgot-password', authLimiter, validate(forgotPasswordDto), authController.forgotPassword);
router.post('/forgotPassword', authLimiter, validate(forgotPasswordDto), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordDto), authController.resetPassword);
router.post('/resetPassword', authLimiter, validate(resetPasswordDto), authController.resetPassword);

// Aliases para prevenir 404 en caso de duplicación de prefijo /auth en clientes
router.post('/auth/forgot-password', authLimiter, validate(forgotPasswordDto), authController.forgotPassword);
router.post('/auth/forgotPassword', authLimiter, validate(forgotPasswordDto), authController.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(resetPasswordDto), authController.resetPassword);
router.post('/auth/resetPassword', authLimiter, validate(resetPasswordDto), authController.resetPassword);

module.exports = router;
