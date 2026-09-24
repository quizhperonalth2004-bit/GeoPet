const AppError = require('./AppError');

class ConflictError extends AppError {
    constructor(message = 'Conflicto con el estado actual del recurso.') {
        super(message, 409);
    }
}

module.exports = ConflictError;
