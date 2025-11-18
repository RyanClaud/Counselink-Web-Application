/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    This file contains controllers for administrator-specific actions.
*/

import { User, Feedback, Appointment } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Renders the user management page with a list of all users.
 */
export const renderUserManagementPage = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        role: { [Op.ne]: 'admin' } // Exclude other admins from the list
      },
      order: [['role', 'ASC'], ['username', 'ASC']]
    });
    res.render('admin/users', { title: 'User Management', user: req.user, users, layout: 'layouts/admin' });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    req.flash('error_msg', 'Failed to load user management page.');
    res.redirect('/dashboard');
  }
};

/**
 * Renders the feedback overview page for admins.
 */
export const renderFeedbackOverview = async (req, res) => {
    try {
        // Get all counselors
        const allCounselors = await User.findAll({
            where: { role: 'counselor' },
            attributes: ['user_id', 'profile_info']
        });

        // Get feedback stats for each counselor
        const counselorsWithFeedback = await Promise.all(
            allCounselors.map(async (counselor) => {
                const feedbackStats = await Feedback.findOne({
                    where: { counselor_id: counselor.user_id },
                    attributes: [
                        [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
                        [sequelize.fn('COUNT', sequelize.col('feedback_id')), 'totalRatings']
                    ],
                    raw: true
                });

                return {
                    user_id: counselor.user_id,
                    profile_info: counselor.profile_info,
                    averageRating: feedbackStats?.averageRating || null,
                    totalRatings: feedbackStats?.totalRatings || 0
                };
            })
        );

        // Sort by average rating (highest first), with null ratings at the end
        counselorsWithFeedback.sort((a, b) => {
            if (a.averageRating === null) return 1;
            if (b.averageRating === null) return -1;
            return b.averageRating - a.averageRating;
        });

        console.log('Counselors with feedback:', JSON.stringify(counselorsWithFeedback, null, 2));

        res.render('admin/feedback', {
            title: 'Feedback Overview',
            layout: 'layouts/admin',
            counselors: counselorsWithFeedback
        });
    } catch (error) {
        console.error('Failed to load feedback overview:', error);
        console.error('Error details:', error.stack);
        req.flash('error_msg', 'Failed to load feedback overview.');
        res.redirect('/dashboard');
    }
};

/**
 * Renders a report of total appointments per counselor for the current day.
 */
export const renderDailyReport = async (req, res) => {
    try {
        // Use the date from query or default to today.
        // The date from the input will be like 'YYYY-MM-DD'.
        const selectedDate = req.query.date ? new Date(req.query.date + 'T00:00:00') : new Date();

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const counselors = await User.findAll({
            where: { role: 'counselor' },
            include: [{
                model: Appointment,
                as: 'counselorAppointments',
                attributes: [],
                where: {
                    date_time: {
                        [Op.between]: [startOfDay, endOfDay]
                    }
                },
                required: false // Use LEFT JOIN to include counselors with 0 appointments
            }],
            attributes: [
                'user_id',
                'profile_info',
                [sequelize.fn('COUNT', sequelize.col('counselorAppointments.appointment_id')), 'appointmentCount']
            ],
            group: ['User.user_id', 'User.profile_info'],
            order: [[sequelize.literal('appointmentCount'), 'DESC']]
        });

        const chartData = {
            labels: counselors.map(c => `${c.profile_info.firstName} ${c.profile_info.lastName}`),
            data: counselors.map(c => c.dataValues.appointmentCount)
        };

        // Format date for the input field (YYYY-MM-DD)
        const reportDate = selectedDate.toISOString().split('T')[0];

        res.render('admin/daily-report', {
            title: 'Daily Report',
            layout: 'layouts/admin',
            counselors,
            chartData,
            reportDate,
            hasAppointments: counselors.some(c => c.dataValues.appointmentCount > 0)
        });
    } catch (error) {
        console.error('Failed to load daily report:', error);
        res.redirect('/dashboard');
    }
};

/**
 * Deactivates a user account (soft delete).
 */
export const deactivateUser = async (req, res) => {
    try {
        const userToDeactivate = await User.findByPk(req.params.id);

        if (!userToDeactivate) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/admin/users');
        }

        if (userToDeactivate.role === 'admin') {
            req.flash('error_msg', 'Cannot deactivate admin accounts.');
            return res.redirect('/admin/users');
        }

        userToDeactivate.is_active = false;
        userToDeactivate.deactivated_at = new Date();
        await userToDeactivate.save();

        req.flash('success_msg', `Account for ${userToDeactivate.email} has been deactivated.`);
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Failed to deactivate user:', error);
        req.flash('error_msg', 'Failed to deactivate user.');
        res.redirect('/admin/users');
    }
};

/**
 * Reactivates a deactivated user account.
 */
export const reactivateUser = async (req, res) => {
    try {
        const userToReactivate = await User.findByPk(req.params.id);

        if (!userToReactivate) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/admin/users');
        }

        userToReactivate.is_active = true;
        userToReactivate.deactivated_at = null;
        await userToReactivate.save();

        req.flash('success_msg', `Account for ${userToReactivate.email} has been reactivated.`);
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Failed to reactivate user:', error);
        req.flash('error_msg', 'Failed to reactivate user.');
        res.redirect('/admin/users');
    }
};

/**
 * Unlocks a user's account.
 */
export const unlockUser = async (req, res) => {
    try {
        const userToUnlock = await User.findByPk(req.params.id);

        if (!userToUnlock) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/admin/users');
        }

        userToUnlock.is_locked = false;
        userToUnlock.failed_login_attempts = 0;
        userToUnlock.lockout_until = null;
        await userToUnlock.save();

        req.flash('success_msg', `Account for ${userToUnlock.email} has been unlocked.`);
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Failed to unlock user:', error);
        req.flash('error_msg', 'Failed to unlock user.');
        res.redirect('/admin/users');
    }
};

/**
 * Renders the page for an admin to add a new user.
 */
export const renderAddUserPage = (req, res) => {
    res.render('admin/add-user', {
        title: 'Add New User',
        user: req.user,
        layout: 'layouts/admin'
    });
};

/**
 * Creates a new user (student or counselor) from the admin panel.
 */
export const createUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, gender, role, student_id } = req.body;

        if (!['student', 'counselor'].includes(role)) {
            req.flash('error_msg', 'Invalid role specified.');
            return res.redirect('/admin/users/add');
        }

        // Validate that student_id is present if the role is student
        if (role === 'student' && !student_id) {
            req.flash('error_msg', 'Student ID is required for student accounts.');
            return res.redirect('/admin/users/add');
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            req.flash('error_msg', 'An account with this email already exists.');
            return res.redirect('/admin/users/add');
        }

        await User.create({
            username: email,
            email,
            password,
            role,
            profile_info: { firstName, lastName, gender, student_id: role === 'student' ? student_id : null }
        });

        req.flash('success_msg', `New ${role} account created successfully.`);
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Failed to create user:', error);
        req.flash('error_msg', 'Failed to create user.');
        res.redirect('/admin/users/add');
    }
};
