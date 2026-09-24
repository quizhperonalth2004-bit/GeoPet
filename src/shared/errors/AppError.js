/**
 * Clase base para errores de dominio en GeoPet.
 * Hereda de Error y estandariza código HTTP, estado operacional y metadatos.
 */
class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
