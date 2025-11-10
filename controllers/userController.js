import { User, Feedback, Appointment } from '../models/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sequelize from '../config/database.js';

/**
 * Renders the user settings page.
 */
export const renderSettingsPage = (req, res) => {
    const layout = req.user.role === 'admin' ? 'layouts/admin' : 'layouts/main';
    const title = req.user.role === 'admin' ? 'System Settings' : 'Account Settings';
    res.render('settings', {
        title: title,
        user: req.user,
        layout: layout
    });
};

/**
 * Renders the feedback page for a counselor.
 */
export const renderMyFeedbackPage = async (req, res) => {
    try {
        const counselor_id = req.user.user_id;

        const feedbacks = await Feedback.findAll({
            where: { counselor_id },
            include: [Appointment], // Use the model directly for a more robust include
            order: [['createdAt', 'DESC']]
        });

        const stats = await Feedback.findOne({
            where: { counselor_id },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
                [sequelize.fn('COUNT', sequelize.col('rating')), 'totalRatings']
            ],
            raw: true
        });

        res.render('feedback/counselor-view', {
            title: 'My Feedback',
            layout: 'layouts/main', // Explicitly set the layout
            user: req.user,
            feedbacks,
            stats
        });
    } catch (error) {
        console.error('Failed to load feedback page:', error);
        req.flash('error_msg', 'Could not load feedback page.');
        res.redirect('/dashboard');
    }
};

/**
 * Updates the user's profile information (e.g., name).
 */
export const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, gender, student_id } = req.body;
        const user = await User.findByPk(req.user.user_id);

        if (!user) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/settings');
        }

        // Ensure profile_info is an object before updating
        const newProfileInfo = { ...(user.profile_info || {}) };
        newProfileInfo.firstName = firstName;
        newProfileInfo.lastName = lastName;
        newProfileInfo.gender = gender;

        // Only update student_id if the user is a student
        if (user.role === 'student') {
            newProfileInfo.student_id = student_id;
        }
        user.profile_info = newProfileInfo;
        await user.save();

        // --- Refresh the JWT with updated user info ---
        // This ensures the name in the header updates immediately on the next page load.
        const token = jwt.sign(
            { id: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        req.flash('success_msg', 'Profile information updated successfully.');
        res.redirect('/settings');
    } catch (error) {
        console.error('Failed to update profile:', error);
        req.flash('error_msg', 'Failed to update profile.');
        res.redirect('/settings');
    }
};

/**
 * Changes the user's password.
 */
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findByPk(req.user.user_id);

        // 1. Verify current password
        const isMatch = await user.validPassword(currentPassword);
        if (!isMatch) {
            req.flash('error_msg', 'Incorrect current password.');
            return res.redirect('/settings');
        }

        // 2. Check if new passwords match
        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'New passwords do not match.');
            return res.redirect('/settings');
        }

        // 3. Check new password length
        if (newPassword.length < 6) {
            req.flash('error_msg', 'Password must be at least 6 characters long.');
            return res.redirect('/settings');
        }

        // 4. Hash and save the new password
        // We must manually hash here because the 'beforeCreate' hook does not run on updates.
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        req.flash('success_msg', 'Password changed successfully.');
        res.redirect('/settings');

    } catch (error) {
        console.error('Failed to change password:', error);
        req.flash('error_msg', 'Failed to change password.');
        res.redirect('/settings');
    }
};