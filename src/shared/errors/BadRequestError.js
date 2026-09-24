const AppError = require('./AppError');

class BadRequestError extends AppError {
    constructor(message = 'Petición inválida.') {
        super(message, 400);
    }
}

module.exports = BadRequestError;
