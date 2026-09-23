/**
 * Middleware para la prevención de ataques de inyección NoSQL en MongoDB.
 * Sanitiza recursivamente req.body, req.query y req.params eliminando cualquier clave
 * que empiece con el prefijo '$' (operadores de MongoDB como $gt, $ne, $where, etc.)
 * o que contenga puntos '.' (notación de acceso a propiedades no autorizadas).
 */

function sanitize(obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item));
    }

    const cleanObj = {};
    for (const key of Object.keys(obj)) {
        // Bloquear operadores que inicien con $ o contengan .
        if (key.startsWith('$') || key.includes('.')) {
            // Ignorar y omitir la clave maliciosa
            continue;
        }

        const value = obj[key];
        if (value && typeof value === 'object') {
            cleanObj[key] = sanitize(value);
        } else {
            cleanObj[key] = value;
        }
    }

    return cleanObj;
}

const mongoSanitize = (req, res, next) => {
    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }
    if (req.params) {
        req.params = sanitize(req.params);
    }
    next();
};

mongoSanitize.sanitize = sanitize;

module.exports = mongoSanitize;
