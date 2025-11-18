# Notification Display Preview

## Dashboard Notification Section

The notification section appears at the top of both student and counselor dashboards with the following design:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔔  ℹ️ You have 3 new notifications          [Mark all as read]    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Your appointment with Dr. Smith has been approved.  5 mins ago│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ New counseling session scheduled for tomorrow.    2 hours ago │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Please complete feedback for your last session.   1 day ago   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Features

### Visual Design
- **Blue accent border** on the left for visibility
- **Light blue background** (#EFF6FF) to stand out from page content
- **White cards** for individual notifications with subtle borders
- **Hover effect** - Cards slightly move right and show shadow on hover
- **Smooth animations** - Section slides down when page loads

### Information Display
- **Bell icon** (🔔) at the top left
- **Notification count** in the header (e.g., "You have 3 new notifications")
- **Message text** clearly displayed in each card
- **Relative timestamps** (e.g., "5 mins ago", "2 hours ago", "Just now")
- **Mark all as read button** in the top right corner

### User Experience
1. **Immediate visibility** - Appears at the very top of the dashboard
2. **Easy to dismiss** - One-click "Mark all as read" button
3. **Responsive design** - Works on mobile, tablet, and desktop
4. **Accessible** - Proper semantic HTML and color contrast

## Header Bell Icon

The notification bell in the header provides quick access from any page:

```
┌─────────────────────────────────────────────────┐
│  CounseLink                    🔔³  👤 John     │
│                                 └─────────────┐ │
│                                 Notifications │ │
│                                 ──────────────│ │
│                                 Your appoint..│ │
│                                 New counseli..│ │
│                                 Please compl..│ │
│                                 ──────────────│ │
│                                 Mark all read │ │
│                                 └─────────────┘ │
└─────────────────────────────────────────────────┘
```

### Features
- **Red badge** with notification count (animated bounce)
- **Dropdown menu** with recent notifications
- **Real-time updates** via Socket.io
- **Toast pop-ups** for new notifications

## Color Scheme

- **Primary Blue**: #3B82F6 (links, icons)
- **Light Blue Background**: #EFF6FF (notification section)
- **Blue Border**: #3B82F6 (left accent)
- **Blue Text**: #1E40AF (header text)
- **White Cards**: #FFFFFF (individual notifications)
- **Gray Text**: #6B7280 (timestamps)
- **Red Badge**: #DC2626 (unread count)

## Animations

1. **Slide Down** (0.4s) - Notification section entrance
2. **Fade In** (0.3s) - Individual notification cards
3. **Hover Effect** - Smooth transform and shadow
4. **Pulse** (2s loop) - Notification bell when unread
5. **Bounce** (1s loop) - Badge counter animation

## Mobile Responsive

On mobile devices:
- Notification section takes full width
- Cards stack vertically
- Timestamps may wrap to next line
- Touch-friendly button sizes
- Bottom navigation doesn't overlap notifications
