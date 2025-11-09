import { Appointment, CounselingRecord, User, Notification } from '../models/index.js';
import { encrypt, decrypt } from '../utils/encryption.js';

/**
 * Renders the page for a counselor to view, add, or edit counseling notes.
 */
export const renderRecordPage = async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const appointment = await Appointment.findByPk(appointment_id, {
      include: ['student', 'counselor', CounselingRecord]
    });

    // Security check: Ensure the logged-in user is the assigned counselor or an admin
    if (req.user.role !== 'admin' && req.user.user_id !== appointment.counselor_id) {
      req.flash('error_msg', 'You are not authorized to view these records.');
      return res.redirect('/dashboard');
    }

    // Decrypt notes if they exist
    if (appointment.CounselingRecord && appointment.CounselingRecord.session_notes) {
      appointment.CounselingRecord.session_notes = decrypt(appointment.CounselingRecord.session_notes);
    }

    res.render('records/edit', {
      title: 'Counseling Notes',
      appointment,
      layout: 'layouts/main'
    });

  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to load counseling records.');
    res.redirect('/dashboard');
  }
};

/**
 * Saves or updates counseling notes for an appointment.
 */
export const saveRecord = async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const { session_notes, progress_tracking } = req.body;

    const appointment = await Appointment.findByPk(appointment_id);

    // Security check: Ensure the logged-in user is the assigned counselor
    if (req.user.user_id !== appointment.counselor_id) {
      req.flash('error_msg', 'You are not authorized to save these records.');
      return res.redirect('/dashboard');
    }

    // Encrypt the session notes before saving
    const encryptedNotes = encrypt(session_notes);

    // Find existing record or create a new one
    let record = await CounselingRecord.findOne({ where: { appointment_id } });

    if (record) {
      // Update existing record
      record.session_notes = encryptedNotes;
      record.progress_tracking = progress_tracking;
      await record.save();
    } else {
      // Create new record
      await CounselingRecord.create({
        appointment_id,
        session_notes: encryptedNotes,
        progress_tracking
      });
    }

    // --- Notify the Student about Progress Tracking Notes ---
    // If progress tracking notes were added, send a notification.
    if (progress_tracking && progress_tracking.trim() !== '') {
      // 1. Create a notification record in the database
      const notification = await Notification.create({
          user_id: appointment.student_id,
          message: `Your counselor left a progress note: "${progress_tracking}"`
      });

      // 2. Emit a real-time notification to the student's browser
      req.io.to(`user-${appointment.student_id}`).emit('new-notification', { message: notification.message });
    }

    req.flash('success_msg', 'Counseling notes saved successfully.');
    res.redirect('/dashboard');

  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to save counseling notes.');
    res.redirect('/dashboard');
  }
};