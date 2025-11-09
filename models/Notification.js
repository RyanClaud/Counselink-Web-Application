import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Notification extends Model {}

Notification.init({
  notification_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('read', 'unread'),
    defaultValue: 'unread',
  },
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  timestamps: true,
});

export default Notification;