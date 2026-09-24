const { z } = require('zod');

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validación de parámetros para comentarios
 */
const commentIdParamDto = z.object({
    id: z.string({
        message: 'El ID de comentario es inválido.'
    }).regex(mongoIdRegex, 'ID de comentario inválido.')
});

/**
 * DTO para la creación de comentarios en publicaciones (Posts)
 */
const createCommentPostDto = z.object({
    content: z.string({
        message: 'El contenido del comentario es obligatorio.'
    })
    .trim()
    .min(1, 'El comentario no puede estar vacío.')
    .max(2000, 'El comentario no puede exceder los 2000 caracteres.'),
    
    postId: z.string({
        message: 'El ID de la publicación es obligatorio.'
    }).regex(mongoIdRegex, 'ID de publicación inválido.')
});

/**
 * DTO para la creación de comentarios en foros (Legacy)
 */
const createCommentForumDto = z.object({
    content: z.string({
        message: 'El contenido del comentario es obligatorio.'
    })
    .trim()
    .min(1, 'El comentario no puede estar vacío.'),
    
    forumId: z.string().optional()
});

module.exports = {
    commentIdParamDto,
    createCommentPostDto,
    createCommentForumDto
};
