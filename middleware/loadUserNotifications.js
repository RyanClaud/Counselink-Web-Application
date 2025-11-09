import { Notification } from '../models/index.js';

/**
 * Middleware to fetch and attach unread notifications for the logged-in user.
 */
const loadUserNotifications = async (req, res, next) => {
    if (req.user) {
        try {
            const notifications = await Notification.findAll({
                where: { user_id: req.user.user_id, status: 'unread' },
                order: [['createdAt', 'DESC']],
                limit: 10
            });
            res.locals.notifications = notifications;
        } catch (error) {
            console.error('Failed to load notifications:', error);
            res.locals.notifications = [];
        }
    }
    next();
};

export default loadUserNotifications;

