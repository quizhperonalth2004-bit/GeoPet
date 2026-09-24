const { ValidationError } = require('../shared/errors');

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
                const firstIssue = error.issues[0];
                const firstMessage = firstIssue ? firstIssue.message : 'Error de validación en la solicitud.';
                const details = error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }));

                return res.status(400).json({
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

module.exports = validate;
