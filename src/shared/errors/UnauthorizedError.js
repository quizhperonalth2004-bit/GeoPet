const AppError = require('./AppError');

class UnauthorizedError extends AppError {
    constructor(message = 'No autorizado. Credenciales inválidas o ausentes.') {
        super(message, 401);
    }
}

module.exports = UnauthorizedError;
