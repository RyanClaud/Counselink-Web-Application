import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

class User extends Model {
  // Instance method to validate password
  async validPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Instance method to manually set and hash a password on update
  async setPassword(password) {
    this.password = await bcrypt.hash(password, 10);
  }
}

User.init({
  user_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('student', 'counselor', 'admin'),
    allowNull: false,
    defaultValue: 'student',
  },
  profile_info: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  failed_login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  is_locked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  lockout_until: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: true, // Allow null temporarily for backward compatibility
  },
  deactivated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, 10);
    },
  },
});

export default User;