# Notification System Guide

## Overview
The notification system displays important messages to counselors and students on their dashboards. Notifications appear in two places:
1. **Dashboard Banner** - A prominent blue notification section at the top of the dashboard
2. **Header Bell Icon** - A dropdown menu accessible from any page

## Features

### Dashboard Notification Section
- **Prominent Display**: Blue banner with left border accent at the top of the dashboard
- **Notification Count**: Shows total number of unread notifications
- **Individual Messages**: Each notification displayed in a white card with:
  - Message text
  - Timestamp (e.g., "5 mins ago", "2 hours ago", "Just now")
  - Hover effect for better interactivity
- **Mark All as Read**: Quick button to clear all notifications
- **Smooth Animations**: Slide-down entrance and fade-in effects

### Header Bell Icon
- **Badge Counter**: Red badge showing unread notification count
- **Dropdown Menu**: Click to view recent notifications (up to 10)
- **Real-time Updates**: Automatically updates when new notifications arrive
- **Toast Notifications**: Floating pop-up for new notifications

## How It Works

### Backend
1. **Notification Model** (`models/Notification.js`):
   - Stores notifications in database
   - Fields: user_id, message, status (read/unread), timestamps

2. **Middleware** (`middleware/loadUserNotifications.js`):
   - Automatically loads unread notifications for logged-in users
   - Limits to 10 most recent notifications
   - Makes notifications available in all views via `res.locals.notifications`

3. **Controller** (`controllers/notificationController.js`):
   - `markNotificationsAsRead`: Marks all user notifications as read

### Frontend
1. **Dashboard Views**:
   - `views/student/dashboard.xian`
   - `views/counselor/dashboard.xian`
   - Both include the notification section with animations

2. **Layout** (`views/layouts/main.xian`):
   - Header notification bell with dropdown
   - Socket.io integration for real-time updates
   - Toast notifications for new messages

3. **Styling** (`public/css/notifications.css`):
   - Smooth animations (slideDown, fadeIn, pulse, bounce)
   - Hover effects
   - Responsive design

## Creating Notifications

To create a notification programmatically:

```javascript
import { Notification } from '../models/index.js';

// Create a notification
await Notification.create({
    user_id: userId,
    message: 'Your appointment has been approved!',
    status: 'unread'
});

// Send real-time notification via Socket.io
req.io.to(`user-${userId}`).emit('new-notification', {
    message: 'Your appointment has been approved!'
});
```

## Customization

### Change Colors
Edit the dashboard views to change the notification banner color:
- `bg-blue-50` - Background color
- `border-blue-500` - Left border color
- `text-blue-800` - Header text color

### Adjust Animation Speed
Edit `public/css/notifications.css`:
- `slideDown` animation: Change `0.4s` to desired duration
- `fadeIn` animation: Change `0.3s` to desired duration

### Modify Notification Limit
Edit `middleware/loadUserNotifications.js`:
- Change `limit: 10` to show more/fewer notifications

## Best Practices

1. **Keep Messages Clear**: Write concise, actionable notification messages
2. **Use Appropriate Timing**: Send notifications for important events only
3. **Test Real-time Updates**: Ensure Socket.io is working for instant notifications
4. **Mobile Responsive**: Notifications work on all screen sizes
5. **Accessibility**: Use semantic HTML and proper ARIA labels

## Troubleshooting

### Notifications Not Showing
- Check if middleware is loaded: `loadUserNotifications`
- Verify user is logged in: `req.user` exists
- Check database for notifications: `status: 'unread'`

### Real-time Updates Not Working
- Ensure Socket.io server is running
- Check browser console for connection errors
- Verify user joined correct room: `user-{userId}`

### Styling Issues
- Ensure CSS file is loaded: `/css/notifications.css`
- Check Tailwind classes are available
- Verify Bootstrap is loaded for layout
