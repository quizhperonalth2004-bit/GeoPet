const { cedulaEcSchema, strongPasswordSchema } = require('./validate.middleware');

/**
 * Middleware para validar el número de cédula ecuatoriana (opcional en el body)
 * Adaptado a validador Zod consolidado
 */
const validateCi = (req, res, next) => {
    const cedula = req.body && req.body.ci;

    if (!cedula) {
        return next();
    }

    const result = cedulaEcSchema.safeParse(cedula);
    if (result.success) {
        next();
    } else {
        res.status(400).json({
            success: false,
            statusCode: 400,
            message: 'Cédula inválida.',
            error: 'Cédula inválida.'
        });
    }
};

/**
 * Middleware para validar la fortaleza de la contraseña
 * Adaptado a validador Zod consolidado
 */
const validatePassword = (req, res, next) => {
    const password = req.body && req.body.password;

    if (!password) {
        return res.status(400).json({
            success: false,
            statusCode: 400,
            message: 'La contraseña es obligatoria.',
            error: 'La contraseña es obligatoria.'
        });
    }

    const result = strongPasswordSchema.safeParse(password);

    if (result.success) {
        next();
    } else {
        const errorMessages = result.error.issues.map(issue => issue.message);

        res.status(400).json({
            success: false,
            statusCode: 400,
            message: 'La contraseña no cumple con los requisitos.',
            error: 'La contraseña no cumple con los requisitos.',
            errors: errorMessages,
            details: errorMessages
        });
    }
};

module.exports = {
    validateCi,
    validatePassword
};
