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

    describe('Flujo de Recuperación de Contraseña mediante OTP por Correo', () => {
        it('POST /api/v1/auth/forgot-password debe generar código OTP y responder 200', async () => {
            const mockUser = {
                _id: 'user123',
                name: 'Carlos',
                email: 'carlos@test.com',
                auth_provider: 'local',
                save: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);

            const res = await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({ email: 'carlos@test.com' });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Código de recuperación enviado');
            expect(mockUser.reset_password_otp).toBeDefined();
            expect(mockUser.reset_password_otp).toHaveLength(6);
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('POST /api/v1/auth/forgot-password debe responder 404 si el usuario no existe', async () => {
            jest.spyOn(User, 'findOne').mockResolvedValue(null);

            const res = await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({ email: 'inexistente@test.com' });

            expect(res.status).toBe(404);
            expect(res.body.message).toContain('No existe ninguna cuenta registrada');
        });

        it('POST /api/v1/auth/reset-password debe validar OTP y actualizar contraseña con 200', async () => {
            const mockUser = {
                _id: 'user123',
                email: 'carlos@test.com',
                auth_provider: 'local',
                reset_password_otp: '123456',
                reset_password_expires: new Date(Date.now() + 10 * 60 * 1000),
                updatePassword: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);

            const res = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({
                    email: 'carlos@test.com',
                    code: '123456',
                    newPassword: 'NuevaPassword123!'
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Contraseña restablecida exitosamente');
            expect(mockUser.updatePassword).toHaveBeenCalledWith('NuevaPassword123!');
        });

        it('POST /api/v1/auth/reset-password debe rechazar con 400 si el código es incorrecto', async () => {
            const mockUser = {
                _id: 'user123',
                email: 'carlos@test.com',
                auth_provider: 'local',
                reset_password_otp: '654321',
                reset_password_expires: new Date(Date.now() + 10 * 60 * 1000),
                updatePassword: jest.fn()
            };

            jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);

            const res = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({
                    email: 'carlos@test.com',
                    code: '000000',
                    newPassword: 'NuevaPassword123!'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('El código de verificación es incorrecto');
            expect(mockUser.updatePassword).not.toHaveBeenCalled();
        });

        it('POST /api/v1/auth/reset-password debe rechazar con 400 si el código ha expirado', async () => {
            const mockUser = {
                _id: 'user123',
                email: 'carlos@test.com',
                auth_provider: 'local',
                reset_password_otp: '123456',
                reset_password_expires: new Date(Date.now() - 5 * 60 * 1000), // Expirado hace 5 min
                updatePassword: jest.fn()
            };

            jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);

            const res = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({
                    email: 'carlos@test.com',
                    code: '123456',
                    newPassword: 'NuevaPassword123!'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('El código de verificación ha expirado');
            expect(mockUser.updatePassword).not.toHaveBeenCalled();
        });

        it('Debe resolver forgot-password bajo /auth/forgot-password, /api/v1/forgot-password y /api/v1/auth/auth/forgot-password sin 404', async () => {
            const mockUser = {
                _id: 'user123',
                name: 'Carlos',
                email: 'carlos@test.com',
                auth_provider: 'local',
                save: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);

            const resDirect = await request(app)
                .post('/auth/forgot-password')
                .send({ email: 'carlos@test.com' });
            expect(resDirect.status).toBe(200);

            const resV1Direct = await request(app)
                .post('/api/v1/forgot-password')
                .send({ email: 'carlos@test.com' });
            expect(resV1Direct.status).toBe(200);

            const resRedundant = await request(app)
                .post('/api/v1/auth/auth/forgot-password')
                .send({ email: 'carlos@test.com' });
            expect(resRedundant.status).toBe(200);
        });
    });

    describe('Google Sign-In Registro en Base de Datos Limpia', () => {
        it('Debe crear User y Profile válidos sin errores de esquema Mongoose', async () => {
            const Profile = require('../src/modules/users/models/profile.model');
            const authService = require('../src/modules/auth/auth.service');

            // Simular DB vacía
            jest.spyOn(User, 'findOne').mockResolvedValue(null);
            jest.spyOn(Profile, 'findOne').mockResolvedValue(null);

            const saveUserSpy = jest.spyOn(User.prototype, 'save').mockImplementation(function () {
                this._id = '507f1f77bcf86cd799439011';
                return Promise.resolve(this);
            });
            const saveProfileSpy = jest.spyOn(Profile.prototype, 'save').mockImplementation(function () {
                this._id = '507f1f77bcf86cd799439022';
                return Promise.resolve(this);
            });

            const { OAuth2Client } = require('google-auth-library');
            jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
                getPayload: () => ({
                    email: 'nuevo_google@example.com',
                    given_name: 'María',
                    family_name: 'Gómez',
                    name: 'María Gómez',
                    picture: 'https://lh3.googleusercontent.com/photo.jpg'
                })
            });

            const result = await authService.googleLogin('fake-google-token');

            expect(result).toBeDefined();
            expect(result.token).toBeDefined();
            expect(result.user.email).toBe('nuevo_google@example.com');
            expect(result.user.auth_provider).toBe('google');
            expect(saveUserSpy).toHaveBeenCalled();
            expect(saveProfileSpy).toHaveBeenCalled();
        });

        it('Debe lanzar ConflictError (409) si el usuario ya existe registrado con contraseña local', async () => {
            const authService = require('../src/modules/auth/auth.service');
            const mockExistingUser = {
                _id: '507f1f77bcf86cd799439099',
                name: 'Usuario Local',
                email: 'existente@example.com',
                auth_provider: 'local'
            };

            jest.spyOn(User, 'findOne').mockResolvedValue(mockExistingUser);

            const { OAuth2Client } = require('google-auth-library');
            jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
                getPayload: () => ({
                    email: 'existente@example.com',
                    name: 'Existing Google User'
                })
            });

            await expect(authService.googleLogin('fake-google-token'))
                .rejects
                .toThrow('Este correo ya está registrado con contraseña.');
        });
    });
});
