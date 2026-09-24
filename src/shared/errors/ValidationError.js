const AppError = require('./AppError');

class ValidationError extends AppError {
    constructor(message = 'Error de validación en los datos proporcionados', details = null) {
        super(message, 400, details);
    }
}

module.exports = ValidationError;
