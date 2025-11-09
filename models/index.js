import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
import Appointment from './Appointment.js';
import CounselingRecord from './CounselingRecord.js';
import Notification from './Notification.js';

class Feedback extends Model {}

Feedback.init({
  feedback_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  appointment_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  counselor_id: { type: DataTypes.INTEGER, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false }, // e.g., 1-5
  comment: { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize,
  modelName: 'Feedback',
  tableName: 'feedbacks',
});

// Define associations

// User (Student) -> Appointment
User.hasMany(Appointment, { foreignKey: 'student_id', as: 'studentAppointments' });
Appointment.belongsTo(User, { foreignKey: 'student_id', as: 'student' });

// User (Counselor) -> Appointment
User.hasMany(Appointment, { foreignKey: 'counselor_id', as: 'counselorAppointments' });
Appointment.belongsTo(User, { foreignKey: 'counselor_id', as: 'counselor' });

// Appointment -> CounselingRecord
Appointment.hasOne(CounselingRecord, { foreignKey: 'appointment_id' });
CounselingRecord.belongsTo(Appointment, { foreignKey: 'appointment_id' });

// Appointment -> Feedback
Appointment.hasOne(Feedback, { foreignKey: 'appointment_id' });
Feedback.belongsTo(Appointment, { foreignKey: 'appointment_id' });

// User -> Notification
User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

// User -> Feedback
User.hasMany(Feedback, { foreignKey: 'student_id', as: 'givenFeedback' });
User.hasMany(Feedback, { foreignKey: 'counselor_id', as: 'receivedFeedback' });

export {
  User,
  Appointment,
  CounselingRecord,
  Notification,
  Feedback
};