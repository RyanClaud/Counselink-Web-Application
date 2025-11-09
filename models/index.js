import User from './User.js';
import Appointment from './Appointment.js';
import CounselingRecord from './CounselingRecord.js';
import Notification from './Notification.js';

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

// User -> Notification
User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

export {
  User,
  Appointment,
  CounselingRecord,
  Notification
};