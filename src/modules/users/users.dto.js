const { z } = require('zod');

/**
 * Validador para parámetro :id de MongoDB
 */
const mongoIdParamDto = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de usuario inválido')
});

/**
 * Validador para actualización de perfil de usuario
 */
const userProfileUpdateDto = z.object({
    name: z.string().trim().min(1, 'El nombre no puede estar vacío').optional(),
    last_name: z.string().trim().optional(),
    number_phone: z.union([z.string(), z.number()]).optional(),
    phone: z.union([z.string(), z.number()]).optional(),
    bio: z.string().max(500, 'La biografía no puede superar los 500 caracteres').optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    photo_profile_url: z.string().optional(),
    profile_picture: z.string().optional(),
    avatar: z.string().optional(),
    status_profile: z.boolean().optional(),
    userId: z.string().optional(),
    _id: z.string().optional()
}).passthrough();

/**
 * Validador para cambio directo de contraseña
 */
const updatePasswordDto = z.object({
    password: z.string({
        required_error: 'La nueva contraseña es requerida.'
    }).min(6, 'La nueva contraseña debe tener al menos 6 caracteres.'),
    currentPassword: z.string().optional(),
    oldPassword: z.string().optional()
});

/**
 * Validador para actualización de rol
 */
const updateUserRoleDto = z.object({
    rol: z.enum(['admin', 'user', 'usuario'], {
        errorMap: () => ({ message: 'El rol debe ser admin, user o usuario.' })
    })
});

module.exports = {
    mongoIdParamDto,
    userProfileUpdateDto,
    updatePasswordDto,
    updateUserRoleDto
};
