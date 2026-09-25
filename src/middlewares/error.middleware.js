const { AppError } = require('../shared/errors');

/**
 * Middleware para manejo de rutas no encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
    const message = `Ruta no encontrada: ${req.method} ${req.originalUrl}`;
    res.status(404).json({
        success: false,
        statusCode: 404,
        message,
        error: 'Ruta no encontrada',
        requestedUrl: req.originalUrl
    });
};

/**
 * Middleware global para captura y manejo centralizado de excepciones (500, Zod, Mongoose, etc.)
 */
const errorHandler = (err, req, res, next) => {
    if (process.env.NODE_ENV !== 'test' || (!err.statusCode || err.statusCode >= 500)) {
        console.error('[Error Middleware]:', err.stack || err);
    }

    let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
    let message = err.message || 'Ha ocurrido un error interno en el servidor.';
    let details = err.details || null;

    // 1. Manejo específico para ZodError (Validaciones declarativas de esquemas)
    if (err.name === 'ZodError' || Array.isArray(err.issues)) {
        statusCode = 400;
        const firstIssue = err.issues && err.issues[0];
        message = firstIssue ? firstIssue.message : 'Error de validación en la solicitud.';
        details = (err.issues || []).map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
        }));
    }
    // 2. Manejo de CastError de Mongoose (IDs inválidos en MongoDB)
    else if (err.name === 'CastError') {
        statusCode = 400;
        message = `Identificador inválido: ${err.value}`;
        details = [{
            field: err.path || 'id',
            message: 'El valor proporcionado no es un identificador válido de base de datos.'
        }];
    }
    // 3. Manejo de claves duplicadas de MongoDB (Código 11000)
    else if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'campo';
        message = `El valor para el campo '${field}' ya está en uso.`;
        details = [{
            field,
            message: 'Ya existe un registro con ese valor en la base de datos.'
        }];
    }
    // 4. Manejo de ValidationError de Mongoose
    else if (err.name === 'ValidationError' && err.errors) {
        statusCode = 400;
        const errorList = Object.values(err.errors);
        message = errorList.map(e => e.message).join(', ');
        details = errorList.map(e => ({
            field: e.path,
            message: e.message
        }));
    }

    const response = {
        success: false,
        statusCode,
        message,
        error: message
    };

    if (details) {
        response.details = details;
        response.errors = details;
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
