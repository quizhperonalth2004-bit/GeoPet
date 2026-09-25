const { z } = require('zod');

/**
 * DTO para inicio de sesión tradicional con credenciales
 */
const loginDto = z.object({
    email: z.string({
        message: 'El correo electrónico es requerido.'
    })
    .trim()
    .min(1, 'El correo electrónico no puede estar vacío.')
    .email('Formato de correo electrónico inválido.'),
    
    password: z.string({
        message: 'La contraseña es requerida.'
    })
    .min(1, 'La contraseña no puede estar vacía.')
});

/**
 * DTO para inicio de sesión federado con Google OAuth
 */
const googleLoginDto = z.object({
    idToken: z.string().min(1).optional(),
    token: z.string().min(1).optional(),
    credential: z.string().min(1).optional(),
    accessToken: z.string().min(1).optional()
}).passthrough().refine(data => data.idToken || data.token || data.credential || data.accessToken, {
    message: 'Token de Google no proporcionado.'
});

/**
 * DTO para solicitud de recuperación de contraseña
 */
const forgotPasswordDto = z.object({
    email: z.string({
        message: 'El correo electrónico es requerido.'
    })
    .trim()
    .min(1, 'El correo electrónico no puede estar vacío.')
    .email('Formato de correo electrónico inválido.')
});

/**
 * DTO para restablecimiento de contraseña mediante OTP / Código
 */
const resetPasswordDto = z.object({
    email: z.string().trim().email('Formato de correo inválido.').optional(),
    phone: z.string().trim().optional(),
    code: z.union([z.string(), z.number()]).transform(val => String(val).trim()),
    newPassword: z.string({
        message: 'La nueva contraseña es requerida.'
    }).min(6, 'La nueva contraseña debe tener al menos 6 caracteres.')
}).refine(data => data.email || data.phone, {
    message: 'Debe proporcionar un correo electrónico o teléfono para restablecer la contraseña.',
    path: ['email']
});

module.exports = {
    loginDto,
    googleLoginDto,
    forgotPasswordDto,
    resetPasswordDto
};
