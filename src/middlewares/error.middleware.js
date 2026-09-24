const { AppError } = require('../shared/errors');

/**
 * Middleware para manejo de rutas no encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
};

/**
 * Middleware global para captura y manejo centralizado de errores de dominio y de sistema
 */
const errorHandler = (err, req, res, next) => {
    if (process.env.NODE_ENV !== 'test' || (!err.statusCode || err.statusCode >= 500)) {
        console.error('[Error Middleware]:', err);
    }

    const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
    const message = err.message || 'Ha ocurrido un error interno en el servidor.';

    const response = {
        message,
        error: message
    };

    if (err.details) {
        response.details = err.details;
        response.errors = err.details;
    }

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

module.exports = {
    notFoundHandler,
    errorHandler
};

