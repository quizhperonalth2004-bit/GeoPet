const { verificarCedula } = require('udv-ec');
const passwordValidator = require('password-validator');

// Esquema de validación de contraseñas
const passwordSchema = new passwordValidator();
passwordSchema
    .is().min(8)                                    // Longitud mínima 8 caracteres
    .has().uppercase()                              // Al menos una letra mayúscula
    .has().lowercase()                              // Al menos una letra minúscula
    .has().digits()                                 // Al menos un número
    .has().symbols();                               // Al menos un símbolo

/**
 * Middleware para validar el número de cédula ecuatoriana (opcional)
 */
const validateCi = (req, res, next) => {
    const cedula = req.body.ci;

    if (!cedula) {
        return next();
    }

    if (verificarCedula(cedula)) {
        next();
    } else {
        res.status(400).json({ message: 'Cédula inválida.' });
    }
};

/**
 * Middleware para validar la fortaleza de la contraseña
 */
const validatePassword = (req, res, next) => {
    const password = req.body.password;

    if (!password) {
        return res.status(400).json({ message: 'La contraseña es obligatoria.' });
    }

    const validationResults = passwordSchema.validate(password, { details: true });

    if (validationResults.length === 0) {
        next();
    } else {
        const errorMessages = validationResults.map(error => {
            switch (error.validation) {
                case 'min':
                    return 'La contraseña debe tener al menos 8 caracteres.';
                case 'uppercase':
                    return 'La contraseña debe contener al menos una letra mayúscula.';
                case 'lowercase':
                    return 'La contraseña debe contener al menos una letra minúscula.';
                case 'digits':
                    return 'La contraseña debe contener al menos un número.';
                case 'symbols':
                    return 'La contraseña debe contener al menos un símbolo.';
                default:
                    return 'La contraseña no cumple con los requisitos de seguridad.';
            }
        });

        res.status(400).json({
            message: 'La contraseña no cumple con los requisitos.',
            errors: errorMessages
        });
    }
};

module.exports = {
    validateCi,
    validatePassword
};
