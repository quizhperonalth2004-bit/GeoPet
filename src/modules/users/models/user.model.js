const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    last_name: {
        type: String,
        required: true,
        trim: true
    },
    ci: {
        type: Number,
        required: false
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    rol: {
        type: String,
        enum: ['admin', 'usuario', 'fundacion'],
        default: 'usuario'
    },
    auth_provider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    profile_picture: {
        type: String,
        default: 'assets/default-avatar.png'
    },
    status_profile: {
        type: Boolean,
        default: false
    },
    last_interaction: {
        type: Date,
        default: Date.now
    }
});

// Middleware para eliminar el perfil cuando se elimina un usuario
userSchema.pre('findOneAndDelete', async function (next) {
    try {
        const user = await this.model.findOne(this.getFilter());
        if (user) {
            const Profile = mongoose.model('Profile');
            if (Profile) {
                await Profile.deleteOne({ user: user._id });
            }
        }
        next();
    } catch (err) {
        next(err);
    }
});

// Método de instancia para actualizar la contraseña de manera segura
userSchema.methods.updatePassword = async function (newPassword) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(newPassword, salt);
    await this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
