import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Renders the user settings page.
 */
export const renderSettingsPage = (req, res) => {
    res.render('settings', {
        title: 'Account Settings',
        user: req.user,
        layout: 'layouts/main'
    });
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

        // Update profile_info, preserving other potential fields like student_id
        user.profile_info = { ...user.profile_info, firstName, lastName, gender };

        // Only update student_id if the user is a student
        if (user.role === 'student') {
            user.profile_info.student_id = student_id;
        }
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