const userService = require('./user.service');

const userController = {
    getUsers: async (req, res, next) => {
        try {
            const usersWithProfiles = await userService.getUsersWithProfiles();
            if (!usersWithProfiles || usersWithProfiles.length === 0) {
                return res.status(404).json({ message: 'No users found' });
            }
            res.json(usersWithProfiles);
        } catch (error) {
            next(error);
        }
    },

    getUserByEmail: async (req, res, next) => {
        const { email } = req.params;
        try {
            const user = await userService.getUserByEmail(email);
            if (!user) {
                return res.status(404).json({ message: '1' });
            }
            res.json(user);
        } catch (error) {
            console.error('Error al buscar usuario:', error);
            next(error);
        }
    },

    getUserById: async (req, res, next) => {
        const { id } = req.params;
        try {
            const user = await userService.getUserById(id);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    createUser: async (req, res, next) => {
        const userData = req.body;
        try {
            const newUser = await userService.createUser(userData);
            res.status(201).json({ message: 'Usuario creado correctamente', user: newUser });
        } catch (error) {
            if (error.code === 11000 && error.keyPattern && error.keyPattern.ci) {
                res.status(400).json({ message: 'Ya existe un usuario en GeoPet con ese número de identificación' });
            } else if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
                res.status(400).json({ message: 'Debes usar otro correo, el que has ingresado ya está en uso' });
            } else if (error.code === 11000 && error.keyPattern && error.keyPattern.username) {
                res.status(400).json({ message: 'El campo usuario que has ingresado no está disponible' });
            } else {
                next(error);
            }
        }
    },

    updatePassword: async (req, res, next) => {
        const { email } = req.params;
        const { password, currentPassword, oldPassword } = req.body;

        try {
            if (!password || typeof password !== 'string' || password.length < 6) {
                return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            }

            // Validar que el usuario autenticado solo pueda actualizar su propia cuenta a menos que sea administrador
            const tokenEmail = req.user && req.user.email;
            const tokenRole = req.user && (req.user.rol || req.user.role);

            if (tokenRole !== 'admin' && tokenEmail && tokenEmail.toLowerCase() !== email.toLowerCase()) {
                return res.status(403).json({ message: 'Acceso denegado: No tienes autorización para modificar la contraseña de este usuario.' });
            }

            const prevPassword = currentPassword || oldPassword;
            const user = await userService.updatePassword(email, password, prevPassword);
            if (!user) {
                return res.status(404).json({ message: 'No existe usuario registrado con este correo electrónico.' });
            }
            res.status(200).json({ message: 'Contraseña actualizada con éxito.' });
        } catch (error) {
            console.error('Error al actualizar la contraseña:', error);
            next(error);
        }
    },

    updateInteraction: async (req, res, next) => {
        const { userId } = req.params;
        try {
            const user = await userService.updateInteraction(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            res.status(200).json({ message: 'Última interacción actualizada' });
        } catch (error) {
            console.error('Error al actualizar la última interacción:', error);
            next(error);
        }
    },

    getUsersAll: async (req, res, next) => {
        try {
            const users = await userService.getAllUsers();
            res.json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            next(error);
        }
    },

    deleteUser: async (req, res, next) => {
        try {
            const userId = req.params.id;
            const user = await userService.deleteUser(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            res.status(200).json({ message: 'Usuario eliminado correctamente.' });
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            next(error);
        }
    },

    updateUserRole: async (req, res, next) => {
        try {
            const userId = req.params.id;
            const { rol } = req.body;
            if (!['admin', 'user', 'usuario'].includes(rol)) {
                return res.status(400).json({ message: 'El rol debe ser admin, user o usuario.' });
            }
            const user = await userService.updateUserRole(userId, rol);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            res.status(200).json({ message: 'Rol actualizado exitosamente.', user });
        } catch (error) {
            console.error('Error al actualizar rol de usuario:', error);
            next(error);
        }
    },

    updateUserProfile: async (req, res, next) => {
        try {
            const profileService = require('./profile.service');
            const targetId = req.params.id || req.user?.userId || req.body.userId || req.body._id;
            if (!targetId) {
                return res.status(400).json({ message: 'Identificador de usuario no proporcionado.' });
            }
            const result = await profileService.updateProfile(targetId, req.body);
            if (!result) {
                return res.status(404).json({ message: 'Usuario o perfil no encontrado.' });
            }
            res.status(200).json(result);
        } catch (error) {
            console.error('Error al actualizar perfil de usuario:', error);
            next(error);
        }
    }
};

module.exports = userController;
