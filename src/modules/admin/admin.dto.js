const { z } = require('zod');

/**
 * Validador para parámetros de consulta (query params) en el panel de administración
 */
const adminQueryDto = z.object({
    filter: z.string().optional(),
    search: z.string().optional(),
    page: z.union([z.string(), z.number()]).optional(),
    limit: z.union([z.string(), z.number()]).optional()
}).passthrough();

/**
 * Validador para asignación de roles a usuarios
 */
const assignRoleDto = z.object({
    rol: z.enum(['admin', 'user', 'usuario'], {
        errorMap: () => ({ message: 'El rol debe ser admin, user o usuario.' })
    })
});

/**
 * Validador para parámetro :id en operaciones de administración
 */
const adminIdParamDto = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido')
});

module.exports = {
    adminQueryDto,
    assignRoleDto,
    adminIdParamDto
};
