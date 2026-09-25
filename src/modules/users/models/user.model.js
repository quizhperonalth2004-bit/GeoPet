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
        required: false,
        default: '',
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
        required: function () {
            return this.auth_provider === 'local';
        }
    },
    rol: {
        type: String,
        enum: ['admin', 'user', 'usuario'],
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
    },
    reset_password_otp: {
        type: String,
        default: null
    },
    reset_password_expires: {
        type: Date,
        default: null
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
    this.reset_password_otp = null;
    this.reset_password_expires = null;
    await this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
