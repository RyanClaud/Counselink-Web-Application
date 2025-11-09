import { Notification } from '../models/index.js';

/**
 * Marks all unread notifications for the current user as 'read'.
 */
export const markNotificationsAsRead = async (req, res) => {
    try {
        await Notification.update(
            { status: 'read' },
            { where: { user_id: req.user.user_id, status: 'unread' } }
        );
        // Redirect back to the previous page or dashboard
        res.redirect('back');
    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
        req.flash('error_msg', 'Could not update notifications.');
        res.redirect('/dashboard');
    }
};