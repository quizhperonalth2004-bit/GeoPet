const request = require('supertest');
const app = require('../src/app');
const User = require('../src/modules/users/models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Auth Module Tests', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('POST /api/v1/auth/login debe autenticar exitosamente cuando las credenciales son correctas', async () => {
        const mockUser = {
            _id: '507f1f77bcf86cd799439011',
            username: 'juanperez',
            email: 'juan@example.com',
            password: '$2a$10$hashedpasswordexample',
            rol: 'usuario',
            save: jest.fn().mockResolvedValue(true)
        };

        jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
        jest.spyOn(jwt, 'sign').mockReturnValue('mocked.jwt.token');

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'juan@example.com', password: 'Password123!' });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('¡Bienvenido, juanperez!');
        expect(res.body.token).toBe('mocked.jwt.token');
    });

    it('POST /api/v1/auth/login debe retornar 404 si el usuario no existe', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue(null);

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'inexistente@example.com', password: 'Password123!' });

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('No existe usuario');
    });

    it('POST /api/v1/auth/logout debe responder 200 con mensaje de éxito', async () => {
        const res = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', 'Bearer some.mock.token');

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Logout exitoso.');
    });

    it('POST /api/v1/auth/google debe rechazar peticiones sin token con 400', async () => {
        const res = await request(app)
            .post('/api/v1/auth/google')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Token de Google no proporcionado');
    });

    it('POST /api/v1/auth/google debe autenticar y responder con 200 y JWT cuando el token es válido', async () => {
        const authService = require('../src/modules/auth/auth.service');
        jest.spyOn(authService, 'googleLogin').mockResolvedValue({
            message: '¡Bienvenido, GoogleUser!',
            token: 'mocked.google.jwt',
            user: {
                _id: '507f1f77bcf86cd799439099',
                name: 'GoogleUser',
                email: 'google@test.com',
                rol: 'usuario'
            }
        });

        const res = await request(app)
            .post('/api/v1/auth/google')
            .send({ idToken: 'valid-google-id-token' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBe('mocked.google.jwt');
        expect(res.body.user.email).toBe('google@test.com');
    });

    it('POST /api/v1/auth/login debe rechazar con 400 si la cuenta fue registrada con Google', async () => {
        const mockGoogleUser = {
            _id: '507f1f77bcf86cd799439012',
            username: 'googler',
            email: 'googler@example.com',
            auth_provider: 'google',
            password: 'hashedpassword'
        };

        jest.spyOn(User, 'findOne').mockResolvedValue(mockGoogleUser);

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'googler@example.com', password: 'AnyPassword123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Esta cuenta fue registrada con Google');
    });

    it('POST /api/v1/auth/google debe rechazar con 409 si el usuario ya está registrado con proveedor local', async () => {
        const authService = require('../src/modules/auth/auth.service');
        const conflictErr = new Error('Este correo ya está registrado con contraseña. Por favor, inicia sesión con tus credenciales habituales.');
        conflictErr.statusCode = 409;
        jest.spyOn(authService, 'googleLogin').mockRejectedValue(conflictErr);

        const res = await request(app)
            .post('/api/v1/auth/google')
            .send({ idToken: 'some-token' });

        expect(res.status).toBe(409);
        expect(res.body.message).toContain('Este correo ya está registrado con contraseña');
    });
});
