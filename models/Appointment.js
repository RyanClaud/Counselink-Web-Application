import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Appointment extends Model {}

Appointment.init({
  appointment_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  counselor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  date_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'completed', 'canceled'),
    defaultValue: 'pending',
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Appointment',
  tableName: 'appointments',
  timestamps: true,
});

export default Appointment;