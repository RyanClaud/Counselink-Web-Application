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
        const counselorsWithFeedback = await User.findAll({
            where: { role: 'counselor' },
            include: [{
                model: Feedback,
                as: 'receivedFeedback',
                attributes: [],
                required: false // This ensures a LEFT JOIN
            }],
            attributes: [
                'user_id',
                'profile_info',
                [sequelize.fn('AVG', sequelize.col('receivedFeedback.rating')), 'averageRating'],
                [sequelize.fn('COUNT', sequelize.col('receivedFeedback.rating')), 'totalRatings']
            ],
            group: ['User.user_id', 'User.profile_info'],
            order: sequelize.options.dialect === 'mysql'
                ? [[sequelize.literal('averageRating IS NULL, averageRating DESC')]]
                : [[sequelize.literal('averageRating'), 'DESC NULLS LAST']]
        });

        res.render('admin/feedback', {
            title: 'Feedback Overview',
            layout: 'layouts/admin',
            counselors: counselorsWithFeedback
        });
    } catch (error) {
        console.error('Failed to load feedback overview:', error);
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
 * Deletes a user.
 */
export const deleteUser = async (req, res) => {
    try {
        await User.destroy({ where: { user_id: req.params.id, role: { [Op.ne]: 'admin' } } });
        req.flash('success_msg', 'User has been deleted successfully.');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Failed to delete user:', error);
        req.flash('error_msg', 'Failed to delete user.');
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
