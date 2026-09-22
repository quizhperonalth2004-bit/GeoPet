const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutos por defecto
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 10000,                     // Límite general de solicitudes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiadas solicitudes desde esta IP, por favor inténtalo de nuevo más tarde.'
    }
});

// Limitador estricto para rutas críticas de autenticación (prevención de ataques de fuerza bruta)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.NODE_ENV === 'test' ? 1000 : (parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20), // 20 intentos en producción
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Demasiados intentos de acceso desde esta IP. Por favor, inténtalo de nuevo en 15 minutos.'
    }
});

limiter.limiter = limiter;
limiter.authLimiter = authLimiter;

module.exports = limiter;

