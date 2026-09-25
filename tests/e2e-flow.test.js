const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/modules/users/models/user.model');
const Post = require('../src/modules/posts/post.model');
const userService = require('../src/modules/users/user.service');
const postService = require('../src/modules/posts/post.service');

describe('E2E Lifecycle Integration Test - GeoPet Community Pet Rescue Flow', () => {
    const jwtSecret = process.env.JWT_SECRET || 'geopet_jwt_test_secret';

    const emisorId = new mongoose.Types.ObjectId().toString();
    const receptorId = new mongoose.Types.ObjectId().toString();
    const postId = new mongoose.Types.ObjectId().toString();

    let emisorToken;
    let receptorToken;

    const mockEmisorUser = {
        _id: emisorId,
        name: 'Carlos',
        last_name: 'Andrade',
        username: 'carlos_emisor',
        email: 'carlos.emisor@geopet.com',
        password: '$2a$10$encryptedMockPasswordEmisor123',
        rol: 'usuario',
        auth_provider: 'local',
        profile_picture: 'assets/default-avatar.png',
        status_profile: true,
        save: jest.fn().mockResolvedValue(true)
    };

    const mockReceptorUser = {
        _id: receptorId,
        name: 'Maria',
        last_name: 'Flores',
        username: 'maria_colaboradora',
        email: 'maria.colab@geopet.com',
        password: '$2a$10$encryptedMockPasswordReceptor123',
        rol: 'usuario',
        auth_provider: 'local',
        profile_picture: 'assets/default-avatar.png',
        status_profile: true,
        save: jest.fn().mockResolvedValue(true)
    };

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Paso 1: Registro y Autenticación de Usuario Emisor y Usuario Receptor (rol: usuario)', () => {
        it('1.1 Debe registrar al usuario emisor exitosamente', async () => {
            jest.spyOn(userService, 'createUser').mockResolvedValue(mockEmisorUser);

            const res = await request(app)
                .post('/api/v1/users/new')
                .send({
                    name: 'Carlos',
                    last_name: 'Andrade',
                    username: 'carlos_emisor',
                    email: 'carlos.emisor@geopet.com',
                    password: 'Password123!',
                    rol: 'usuario'
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Usuario creado correctamente');
            expect(res.body.user.email).toBe('carlos.emisor@geopet.com');
            expect(res.body.user.rol).toBe('usuario');
        });

        it('1.2 Debe autenticar al usuario emisor y generar su token JWT', async () => {
            jest.spyOn(User, 'findOne').mockResolvedValue(mockEmisorUser);
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'carlos.emisor@geopet.com',
                    password: 'Password123!'
                });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            emisorToken = res.body.token;

            // Verificar que el payload del token tiene rol 'usuario'
            const decoded = jwt.verify(emisorToken, jwtSecret);
            expect(decoded.rol).toBe('usuario');
            expect(decoded.userId).toBe(emisorId);
        });

        it('1.3 Debe registrar al usuario receptor (colaborador de la comunidad)', async () => {
            jest.spyOn(userService, 'createUser').mockResolvedValue(mockReceptorUser);

            const res = await request(app)
                .post('/api/v1/users/new')
                .send({
                    name: 'Maria',
                    last_name: 'Flores',
                    username: 'maria_colaboradora',
                    email: 'maria.colab@geopet.com',
                    password: 'Password123!',
                    rol: 'usuario'
                });

            expect(res.status).toBe(201);
            expect(res.body.user.email).toBe('maria.colab@geopet.com');
            expect(res.body.user.rol).toBe('usuario');
        });

        it('1.4 Debe autenticar al usuario receptor y generar su token JWT', async () => {
            jest.spyOn(User, 'findOne').mockResolvedValue(mockReceptorUser);
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'maria.colab@geopet.com',
                    password: 'Password123!'
                });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            receptorToken = res.body.token;

            const decoded = jwt.verify(receptorToken, jwtSecret);
            expect(decoded.rol).toBe('usuario');
            expect(decoded.userId).toBe(receptorId);
        });
    });

    describe('Paso 2: Creación de Reporte "Perdido" con Coordenadas GPS Válidas', () => {
        it('2.1 Debe crear el reporte de mascota perdida con coordenadas geoespaciales', async () => {
            const mockCreatedPost = {
                _id: postId,
                type: 'Perdida',
                status: 'perdido',
                body: 'Se extravió mi perrito Max en el Parque La Carolina, lleva collar rojo.',
                location: { type: 'Point', coordinates: [-78.484, -0.180] },
                address: 'Parque La Carolina, Quito',
                reward: 50,
                owner: emisorId,
                sightings: [],
                createdAt: new Date().toISOString()
            };

            jest.spyOn(postService, 'createPost').mockResolvedValue({
                post: mockCreatedPost,
                pet: null
            });

            const res = await request(app)
                .post('/api/v1/posts/new')
                .send({
                    type: 'Perdida',
                    body: 'Se extravió mi perrito Max en el Parque La Carolina, lleva collar rojo.',
                    coordinates: [-78.484, -0.180],
                    address: 'Parque La Carolina, Quito',
                    reward: 50,
                    owner: emisorId
                });

            expect(res.status).toBe(201);
            expect(res.body.post).toBeDefined();
            expect(res.body.post.type).toBe('Perdida');
            expect(res.body.post.status).toBe('perdido');
            expect(res.body.post.location.coordinates).toEqual([-78.484, -0.180]);
            expect(res.body.post.reward).toBe(50);
        });
    });

    describe('Paso 3: Registro de Avistamiento Colaborativo desde el Segundo Usuario', () => {
        it('3.1 Debe permitir al usuario receptor reportar un avistamiento autenticado', async () => {
            // Asegurar receptorToken válido
            const validReceptorToken = jwt.sign(
                { userId: receptorId, email: 'maria.colab@geopet.com', rol: 'usuario' },
                jwtSecret,
                { expiresIn: '1h' }
            );

            const mockPostWithSightings = {
                _id: postId,
                owner: emisorId,
                sightings: [],
                save: jest.fn().mockImplementation(function() {
                    return Promise.resolve(this);
                }),
                populate: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(Post, 'findById').mockResolvedValue(mockPostWithSightings);

            const res = await request(app)
                .post(`/api/v1/posts/${postId}/sightings`)
                .set('Authorization', `Bearer ${validReceptorToken}`)
                .send({
                    location: { lat: -0.181, lng: -78.485 },
                    comment: 'Acabo de ver a Max jugando cerca de la laguna artificial con otro perro'
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Avistamiento registrado exitosamente');
            expect(res.body.sighting).toBeDefined();
            expect(res.body.sighting.location.lat).toBe(-0.181);
            expect(res.body.sighting.location.lng).toBe(-78.485);
            expect(res.body.sighting.comment).toContain('laguna artificial');
        });
    });

    describe('Paso 4: Marcado del Reporte como "Encontrado" por parte del Dueño', () => {
        it('4.1 Debe actualizar el estado del reporte a "Encontrado"', async () => {
            const resolvedPost = {
                _id: postId,
                type: 'Encontrado',
                status: 'encontrado',
                body: 'Se extravió mi perrito Max en el Parque La Carolina, lleva collar rojo.',
                owner: emisorId,
                reward: 50
            };

            jest.spyOn(postService, 'updatePost').mockResolvedValue(resolvedPost);

            const res = await request(app)
                .patch(`/api/v1/posts/${postId}`)
                .send({
                    type: 'Encontrado'
                });

            expect(res.status).toBe(200);
            expect(res.body.type).toBe('Encontrado');
            expect(res.body.status).toBe('encontrado');
        });
    });

    describe('Paso 5: Intento Denegado (HTTP 403 Forbidden) al Panel de Administración sin rol "admin"', () => {
        it('5.1 Usuario con rol "usuario" no debe poder acceder a métricas de administración (403)', async () => {
            const userToken = jwt.sign(
                { userId: receptorId, email: 'maria.colab@geopet.com', rol: 'usuario' },
                jwtSecret,
                { expiresIn: '1h' }
            );

            const res = await request(app)
                .get('/api/v1/admin/metrics')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Acceso denegado');
        });

        it('5.2 Usuario con rol "usuario" no debe poder listar todos los usuarios en /allUsers (403)', async () => {
            const userToken = jwt.sign(
                { userId: emisorId, email: 'carlos.emisor@geopet.com', rol: 'usuario' },
                jwtSecret,
                { expiresIn: '1h' }
            );

            const res = await request(app)
                .get('/api/v1/users/allUsers')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Acceso denegado');
        });
    });
});
