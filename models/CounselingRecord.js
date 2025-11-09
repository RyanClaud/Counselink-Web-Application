import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class CounselingRecord extends Model {}

CounselingRecord.init({
  record_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  appointment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  session_notes: {
    type: DataTypes.TEXT, // Encryption will be handled at the application level
    allowNull: false,
  },
  progress_tracking: {
    type: DataTypes.TEXT,
  },
}, {
  sequelize,
  modelName: 'CounselingRecord',
  tableName: 'counseling_records',
  timestamps: true,
});

export default CounselingRecord;