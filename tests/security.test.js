const request = require('supertest');
const app = require('../src/app');
const User = require('../src/modules/users/models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoSanitize = require('../src/middlewares/mongoSanitize.middleware');

describe('Security & Non-Functional Tests (QA Suite)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Seguridad de Autenticación y Datos Sensibles (OWASP A02)', () => {
        it('POST /api/v1/auth/login NO debe exponer el hash de contraseña en el objeto user de la respuesta', async () => {
            const mockUser = {
                _id: '507f1f77bcf86cd799439011',
                username: 'seguridad_user',
                email: 'seguridad@test.com',
                password: '$2a$10$SuperSecretHashThatMustNeverBeLeaked',
                rol: 'usuario',
                save: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
            jest.spyOn(jwt, 'sign').mockReturnValue('secure.mocked.jwt');

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'seguridad@test.com', password: 'ValidPassword123!' });

            expect(res.status).toBe(200);
            expect(res.body.token).toBe('secure.mocked.jwt');
            expect(res.body.user).toBeDefined();
            // Verificación estricta: 'password' debe ser undefined en la respuesta
            expect(res.body.user.password).toBeUndefined();
            expect(JSON.stringify(res.body)).not.toContain('SuperSecretHashThatMustNeverBeLeaked');
        });
    });

    describe('Prevención de Inyección NoSQL en MongoDB (OWASP A03)', () => {
        it('mongoSanitize middleware debe desarmar operadores de inyección ($gt, $ne, etc.) recursivamente', () => {
            const req = {
                body: {
                    email: { $gt: '' },
                    password: 'test',
                    profile: {
                        bio: 'Hola',
                        $where: 'malicious code'
                    }
                },
                query: {
                    type: { $ne: null },
                    search: 'perro'
                },
                params: {
                    id: '123'
                }
            };
            const res = {};
            const next = jest.fn();

            mongoSanitize(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            // $gt debe haber sido eliminado de email
            expect(req.body.email).toEqual({});
            expect(req.body.email.$gt).toBeUndefined();
            expect(req.body.password).toBe('test');
            // $where en subobjeto debe haber sido eliminado
            expect(req.body.profile.$where).toBeUndefined();
            expect(req.body.profile.bio).toBe('Hola');
            // $ne en query debe haber sido eliminado
            expect(req.query.type).toEqual({});
            expect(req.query.type.$ne).toBeUndefined();
            expect(req.query.search).toBe('perro');
        });

        it('Ruta protegida por Express debe recibir el body sanitizado frente a payloads NoSQL', async () => {
            // Hacemos una petición con un body que incluye $ne
            const res = await request(app)
                .post('/api/v1/auth/google')
                .send({
                    idToken: { $ne: null }
                });

            // Al ser un idToken no string/vacío, debe responder con 400 por validación sin provocar crash
            expect(res.status).toBe(400);
        });
    });

    describe('Seguridad de Subida de Archivos (Multer)', () => {
        it('Debe rechazar subida de archivos con extensiones peligrosas (.exe, .html, .js)', async () => {
            const adminToken = jwt.sign(
                { userId: 'admin1', email: 'admin@test.com', rol: 'admin' },
                process.env.JWT_SECRET || 'fabricio29'
            );

            const res = await request(app)
                .post('/api/v1/pets/new')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('name', 'PetTest')
                .field('breed', 'Mestizo')
                .attach('photo_profile', Buffer.from('console.log("malicious")'), 'script.js');

            expect(res.status).toBe(400);
            expect(res.body.error || res.body.message).toMatch(/Formato no permitido|prohibidos/);
        });
    });

    describe('Cabeceras de Seguridad HTTP (Helmet)', () => {
        it('Debe incluir cabeceras de protección básicas en las respuestas HTTP', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.headers['x-dns-prefetch-control']).toBeDefined();
            expect(res.headers['x-frame-options']).toBeDefined();
            expect(res.headers['x-content-type-options']).toBe('nosniff');
        });
    });
});
