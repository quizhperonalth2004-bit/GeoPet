const userService = require('./user.service');

const userController = {
    getUsers: async (req, res) => {
        try {
            const usersWithProfiles = await userService.getUsersWithProfiles();
            if (!usersWithProfiles || usersWithProfiles.length === 0) {
                return res.status(404).json({ message: 'No users found' });
            }
            res.json(usersWithProfiles);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getUserByEmail: async (req, res) => {
        const { email } = req.params;
        try {
            const user = await userService.getUserByEmail(email);
            if (!user) {
                return res.status(404).json({ message: '1' });
            }
            res.json(user);
        } catch (error) {
            console.error('Error al buscar usuario:', error);
            res.status(500).json({ message: error.message });
        }
    },

    getUserById: async (req, res) => {
        const { id } = req.params;
        try {
            const user = await userService.getUserById(id);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    createUser: async (req, res) => {
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
                res.status(400).json({ message: error.message });
            }
        }
    },

    updatePassword: async (req, res) => {
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
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            console.error('Error al actualizar la contraseña:', error);
            res.status(500).json({ message: 'Hubo un error al actualizar la contraseña. Por favor, inténtalo de nuevo más tarde.' });
        }
    },

    updateInteraction: async (req, res) => {
        const { userId } = req.params;
        try {
            const user = await userService.updateInteraction(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            res.status(200).json({ message: 'Última interacción actualizada' });
        } catch (error) {
            console.error('Error al actualizar la última interacción:', error);
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    },

    getUsersAll: async (req, res) => {
        try {
            const users = await userService.getAllUsers();
            res.json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ error: 'Error fetching users' });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await userService.deleteUser(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            res.status(200).json({ message: 'Usuario eliminado correctamente.' });
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            res.status(500).json({ message: 'Error al eliminar el usuario.', error: error.message });
        }
    },

    updateUserRole: async (req, res) => {
        try {
            const userId = req.params.id;
            const { rol } = req.body;
            if (!['admin', 'usuario', 'fundacion'].includes(rol)) {
                return res.status(400).json({ message: 'El rol debe ser admin, usuario o fundacion.' });
            }
            const user = await userService.updateUserRole(userId, rol);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            res.status(200).json({ message: 'Rol actualizado exitosamente.', user });
        } catch (error) {
            console.error('Error al actualizar rol de usuario:', error);
            res.status(500).json({ message: 'Error al actualizar el rol.', error: error.message });
        }
    },

    updateUserProfile: async (req, res) => {
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
            res.status(500).json({ message: 'Error al actualizar perfil.', error: error.message });
        }
    }
};

module.exports = userController;
