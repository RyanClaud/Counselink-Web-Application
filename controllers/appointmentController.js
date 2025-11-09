import { Appointment, User, Notification } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Renders the page for booking a new appointment.
 * Fetches a list of all counselors to be displayed in a dropdown.
 */
export const renderNewAppointmentPage = async (req, res) => {
  try {
    const counselors = await User.findAll({ where: { role: 'counselor' } });
    res.render('appointments/new', {
      title: 'Book Appointment',
      counselors,
      layout: 'layouts/main'
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to load the booking page.');
    res.redirect('/dashboard');
  }
};

/**
 * Handles the creation of a new appointment.
 */
export const createAppointment = async (req, res) => {
  try {
    const { counselor_id, date_time, reason } = req.body;
    const student_id = req.user.user_id; // from protect middleware

    if (!counselor_id || !date_time || !reason) {
      req.flash('error_msg', 'Please fill out all fields.');
      return res.redirect('/appointments/new');
    }

    // --- Validation ---
    // 1. Check if the date is in the past
    if (new Date(date_time) < new Date()) {
      req.flash('error_msg', 'You cannot book an appointment in the past.');
      return res.redirect('/appointments/new');
    }

    // 2. Check for overlapping appointments for the same counselor
    const existingAppointment = await Appointment.findOne({
      where: {
        counselor_id,
        date_time,
        status: { [Op.in]: ['pending', 'approved'] }
      }
    });

    if (existingAppointment) {
      req.flash('error_msg', 'This time slot is unavailable. Please choose a different time.');
      return res.redirect('/appointments/new');
    }

    const newAppointment = await Appointment.create({
      student_id,
      counselor_id,
      date_time,
      reason,
      status: 'pending'
    });

    // --- Notify the Counselor ---
    // Get student's name for a more descriptive notification
    const student = await User.findByPk(student_id);
    const studentName = student ? `${student.profile_info.firstName} ${student.profile_info.lastName}` : 'A student';

    // 1. Create a notification record in the database
    const notification = await Notification.create({
        user_id: counselor_id,
        message: `You have a new appointment request from ${studentName}.`
    });

    // 2. Emit a real-time notification to the counselor's browser
    req.io.to(`user-${counselor_id}`).emit('new-notification', { message: notification.message });

    req.flash('success_msg', 'Appointment requested successfully! You will be notified upon approval.');
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to create appointment.');
    res.redirect('/appointments/new');
  }
};

/**
 * Approves a pending appointment.
 * Accessible only by counselors for appointments assigned to them.
 */
export const approveAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const counselor_id = req.user.user_id;

    const appointment = await Appointment.findOne({
      where: { appointment_id: id, counselor_id }
    });

    if (!appointment || appointment.status !== 'pending') {
      req.flash('error_msg', 'Appointment not found or cannot be approved.');
      return res.redirect('/dashboard');
    }

    appointment.status = 'approved';
    await appointment.save();

    // Create a notification for the student
    const notification = await Notification.create({
      user_id: appointment.student_id,
      message: `Your appointment for ${new Date(appointment.date_time).toLocaleString()} has been approved.`
    });

    // Emit a real-time notification to the student
    req.io.to(`user-${appointment.student_id}`).emit('new-notification', { message: notification.message });

    req.flash('success_msg', 'Appointment approved successfully.');
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Failed to approve appointment.');
    res.redirect('/dashboard');
  }
};