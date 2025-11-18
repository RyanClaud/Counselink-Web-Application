import { Appointment, User, Notification, Feedback } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Renders the page for booking a new appointment.
 * Fetches a list of all counselors to be displayed in a dropdown.
 */
export const renderNewAppointmentPage = async (req, res) => {
  try {
    const sequelize = (await import('../config/database.js')).default;
    
    // Get counselors with their average ratings
    const counselors = await User.findAll({ 
      where: { role: 'counselor' },
      attributes: [
        'user_id',
        'username',
        'email',
        'profile_info',
        [sequelize.fn('AVG', sequelize.col('receivedFeedback.rating')), 'avgRating'],
        [sequelize.fn('COUNT', sequelize.col('receivedFeedback.feedback_id')), 'feedbackCount']
      ],
      include: [{
        model: Feedback,
        as: 'receivedFeedback',
        attributes: [],
        required: false
      }],
      group: ['User.user_id', 'User.username', 'User.email', 'User.profile_info'],
      raw: true
    });
    
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
 * Renders the feedback form for a completed appointment.
 */
export const renderFeedbackPage = async (req, res) => {
    try {
        const { appointment_id } = req.params;
        const appointment = await Appointment.findOne({
            where: {
                appointment_id,
                student_id: req.user.user_id,
                status: 'completed'
            },
            include: ['counselor']
        });

        if (!appointment) {
            req.flash('error_msg', 'Appointment not found or not completed.');
            return res.redirect('/dashboard');
        }

        res.render('feedback/new', {
            title: 'Leave Feedback',
            layout: 'layouts/main',
            appointment
        });
    } catch (error) {
        console.error('Failed to load feedback page:', error);
        req.flash('error_msg', 'Could not load feedback page.');
        res.redirect('/dashboard');
    }
};

/**
 * Submits feedback for an appointment.
 */
export const submitFeedback = async (req, res) => {
    try {
        const { appointment_id } = req.params;
        const { rating, comment } = req.body;
        const student_id = req.user.user_id;

        const appointment = await Appointment.findByPk(appointment_id);

        await Feedback.create({
            appointment_id,
            student_id,
            counselor_id: appointment.counselor_id,
            rating,
            comment
        });

        req.flash('success_msg', 'Thank you for your feedback!');
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Failed to submit feedback:', error);
        req.flash('error_msg', 'Failed to submit feedback. You may have already left feedback for this session.');
        res.redirect('/dashboard');
    }
};

/**
 * Handles the creation of a new appointment.
 */
export const createAppointment = async (req, res) => {
  try {
    const { date_time, reason } = req.body;
    const counselor_id = parseInt(req.body.counselor_id, 10); // Ensure counselor_id is an integer from the start
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
      message: `Your appointment for ${appointment.date_time.toLocaleString()} has been approved.`
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

/**
 * Marks an appointment as 'completed'.
 * Accessible only by the assigned counselor for an approved appointment.
 */
export const completeAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const counselor_id = req.user.user_id;

        const appointment = await Appointment.findOne({
            where: { appointment_id: id, counselor_id }
        });

        if (!appointment || appointment.status !== 'approved') {
            req.flash('error_msg', 'Appointment not found or cannot be completed.');
            return res.redirect('/dashboard');
        }

        appointment.status = 'completed';
        await appointment.save();

        // Notify the student that the session is complete and they can leave feedback
        const notification = await Notification.create({
            user_id: appointment.student_id,
            message: `Your session on ${appointment.date_time.toLocaleString()} is now complete. You can now leave feedback.`
        });
        req.io.to(`user-${appointment.student_id}`).emit('new-notification', { message: notification.message });

        req.flash('success_msg', 'Session marked as complete.');
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Failed to complete appointment:', error);
        req.flash('error_msg', 'Failed to complete the appointment.');
        res.redirect('/dashboard');
    }
};