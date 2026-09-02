/**
 * Middleware para manejo de rutas no encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
};

/**
 * Middleware global para captura y manejo de errores (500)
 */
const errorHandler = (err, req, res, next) => {
    console.error('[Error Middleware]:', err);

    const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

    res.status(statusCode).json({
        message: err.message || 'Ha ocurrido un error interno en el servidor.',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = {
    notFoundHandler,
    errorHandler
};
