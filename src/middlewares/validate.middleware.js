const { z } = require('zod');
const { verificarCedula } = require('udv-ec');

/**
 * Validador Zod personalizado para cédulas ecuatorianas
 */
const cedulaEcSchema = z.string()
    .trim()
    .refine(val => !val || verificarCedula(val), {
        message: 'Cédula inválida.'
    });

/**
 * Validador Zod personalizado para fortaleza de contraseñas:
 * - Mínimo 8 caracteres
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un dígito
 * - Al menos un símbolo
 */
const strongPasswordSchema = z.string({
    required_error: 'La contraseña es obligatoria.',
    invalid_type_error: 'La contraseña debe ser una cadena de texto.'
})
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula.')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula.')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número.')
    .regex(/[^A-Za-z0-9]/, 'La contraseña debe contener al menos un símbolo.');

/**
 * Validador Zod para ObjectId de MongoDB (24 caracteres hexadecimales)
 */
const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido');

/**
 * Middleware genérico de validación declarativa utilizando Zod.
 * Permite validar 'body', 'query', 'params' o un schema directo.
 * 
 * Uso:
 *   validate(schema, 'body')
 *   validate({ body: schemaBody, query: schemaQuery, params: schemaParams })
 * 
 * @param {import('zod').ZodTypeAny | { body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemaOrConfig
 * @param {'body' | 'query' | 'params'} [defaultSource='body']
 */
const validate = (schemaOrConfig, defaultSource = 'body') => {
    return async (req, res, next) => {
        try {
            if (schemaOrConfig && (schemaOrConfig.body || schemaOrConfig.query || schemaOrConfig.params)) {
                if (schemaOrConfig.params) {
                    req.params = await schemaOrConfig.params.parseAsync(req.params);
                }
                if (schemaOrConfig.query) {
                    req.query = await schemaOrConfig.query.parseAsync(req.query);
                }
                if (schemaOrConfig.body) {
                    req.body = await schemaOrConfig.body.parseAsync(req.body);
                }
            } else if (schemaOrConfig && typeof schemaOrConfig.parseAsync === 'function') {
                const parsed = await schemaOrConfig.parseAsync(req[defaultSource]);
                req[defaultSource] = parsed;
            }
            next();
        } catch (error) {
            if (error.name === 'ZodError') {
                const firstIssue = error.issues && error.issues[0];
                const firstMessage = firstIssue ? firstIssue.message : 'Error de validación en la solicitud.';
                const details = (error.issues || []).map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }));

                return res.status(400).json({
                    success: false,
                    statusCode: 400,
                    message: firstMessage,
                    error: firstMessage,
                    details,
                    errors: details
                });
            }
            next(error);
        }
    };
};

validate.validate = validate;
validate.cedulaEcSchema = cedulaEcSchema;
validate.strongPasswordSchema = strongPasswordSchema;
validate.mongoIdSchema = mongoIdSchema;

module.exports = validate;
