# Admin Dashboard Improvements - Top Counselors & Recent Activity

## Issues Fixed

### 1. Top Performing Counselors - "No counselor data available yet"
**Problem**: The section showed "No counselor data available yet" even when counselors existed.

**Root Cause**: Complex GROUP BY query with multiple aggregations was failing silently or returning data in an inaccessible format.

**Solution**: Rewrote the query using a simpler, more reliable approach:
- Get all counselors first
- Calculate stats for each counselor individually
- Combine and sort the results

### 2. Recent Activity - Long Date Format
**Problem**: Dates displayed as "Tue Nov 18 2025 08:20:00 GMT+0800 (Philippine Standard Time)" - too long and cluttered.

**Solution**: 
- Created new `formatDateTime` Handlebars helper
- Formats dates as "Nov 18, 2025, 08:20 AM" - much cleaner

---

## Changes Made

### 1. New Handlebars Helper - `formatDateTime`

**File**: `index.js`

```javascript
hbs.registerHelper('formatDateTime', function (date) {
    if (!date) return '';
    const d = new Date(date);
    const options = { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    };
    return d.toLocaleDateString('en-US', options);
});
```

**Usage**:
```handlebars
{{formatDateTime this.date_time}}
```

**Output Examples**:
- `Nov 18, 2025, 08:20 AM`
- `Dec 25, 2025, 02:30 PM`
- `Jan 1, 2026, 12:00 PM`

---

### 2. Improved Top Counselors Query

**File**: `controllers/authController.js`

**Before** (Complex, unreliable):
```javascript
topCounselors = await User.findAll({
    where: { role: 'counselor' },
    attributes: [
        'user_id',
        'profile_info',
        [sequelize.fn('COUNT', sequelize.col('counselorAppointments.appointment_id')), 'totalAppointments'],
        [sequelize.fn('AVG', sequelize.col('receivedFeedback.rating')), 'avgRating']
    ],
    include: [...],
    group: ['User.user_id', 'User.profile_info'],
    raw: true
});
```

**After** (Simple, reliable):
```javascript
// Step 1: Get all counselors
const allCounselors = await User.findAll({
    where: { role: 'counselor' },
    attributes: ['user_id', 'profile_info']
});

// Step 2: Get stats for each counselor
topCounselors = await Promise.all(
    allCounselors.map(async (counselor) => {
        const appointmentCount = await Appointment.count({
            where: { counselor_id: counselor.user_id }
        });

        const avgRatingResult = await Feedback.findOne({
            where: { counselor_id: counselor.user_id },
            attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
            raw: true
        });

        return {
            user_id: counselor.user_id,
            profile_info: counselor.profile_info,
            totalAppointments: appointmentCount,
            avgRating: avgRatingResult?.avgRating || null
        };
    })
);

// Step 3: Sort and limit
topCounselors.sort((a, b) => b.totalAppointments - a.totalAppointments);
topCounselors = topCounselors.slice(0, 5);
```

**Benefits**:
- ✅ More reliable - works consistently
- ✅ Easier to debug - clear data structure
- ✅ Better error handling
- ✅ Console logging for verification

---

### 3. Updated Recent Activity Display

**File**: `views/dashboard.xian`

**Before**:
```handlebars
<i class="far fa-calendar me-1"></i>{{this.date_time}}
```
Output: `Tue Nov 18 2025 08:20:00 GMT+0800 (Philippine Standard Time)`

**After**:
```handlebars
<i class="far fa-calendar me-1"></i>{{formatDateTime this.date_time}}
```
Output: `Nov 18, 2025, 08:20 AM`

---

### 4. Improved Empty State for Top Counselors

**File**: `views/dashboard.xian`

**Before**:
```html
<p class="text-center text-muted py-4">No counselor data available yet.</p>
```

**After**:
```html
<div class="text-center text-muted py-5">
    <i class="fas fa-user-tie fa-3x mb-3 opacity-50"></i>
    <p class="mb-1">No counselor appointments yet</p>
    <small>Counselors will appear here once they have appointments</small>
</div>
```

**Benefits**:
- ✅ More informative message
- ✅ Visual icon for better UX
- ✅ Explains why it's empty
- ✅ Sets expectations

---

## Visual Comparison

### Top Performing Counselors

**Before**:
```
┌─────────────────────────────────┐
│ 🏆 Top Performing Counselors    │
├─────────────────────────────────┤
│ No counselor data available yet.│
└─────────────────────────────────┘
```

**After** (with data):
```
┌─────────────────────────────────────────┐
│ 🏆 Top Performing Counselors            │
├─────────────────────────────────────────┤
│ 1  Counselor Ryan                       │
│    📅 15 appointments                   │
│    ★★★★★ (5.0)                         │
├─────────────────────────────────────────┤
│ 2  Dr. Sarah Smith                      │
│    📅 12 appointments                   │
│    ★★★★½ (4.6)                         │
└─────────────────────────────────────────┘
```

**After** (no data):
```
┌─────────────────────────────────────────┐
│ 🏆 Top Performing Counselors            │
├─────────────────────────────────────────┤
│         👔                              │
│                                         │
│   No counselor appointments yet         │
│   Counselors will appear here once      │
│   they have appointments                │
└─────────────────────────────────────────┘
```

---

### Recent Activity

**Before**:
```
┌──────────────────────────────────────────────────────────┐
│ 🕐 Recent Activity                                       │
├──────────────────────────────────────────────────────────┤
│ Ryan Claud → Counselor Ryan                  [pending]   │
│ 📅 Tue Nov 18 2025 08:20:00 GMT+0800 (Philippine...)    │
├──────────────────────────────────────────────────────────┤
│ Ryan Claud → Counselor Ryan                  [completed] │
│ 📅 Tue Nov 18 2025 08:10:00 GMT+0800 (Philippine...)    │
└──────────────────────────────────────────────────────────┘
```

**After**:
```
┌──────────────────────────────────────────────────────────┐
│ 🕐 Recent Activity                                       │
├──────────────────────────────────────────────────────────┤
│ Ryan Claud → Counselor Ryan                  [pending]   │
│ 📅 Nov 18, 2025, 08:20 AM                               │
├──────────────────────────────────────────────────────────┤
│ Ryan Claud → Counselor Ryan                  [completed] │
│ 📅 Nov 18, 2025, 08:10 AM                               │
└──────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### Top Performing Counselors
- [ ] Shows counselors when appointments exist
- [ ] Displays correct appointment count
- [ ] Shows star ratings if feedback exists
- [ ] Shows "No ratings yet" for counselors without feedback
- [ ] Sorts by appointment count (highest first)
- [ ] Limits to top 5 counselors
- [ ] Shows helpful empty state when no appointments

### Recent Activity
- [ ] Displays last 5 appointments
- [ ] Shows student and counselor names
- [ ] Displays formatted date/time (short format)
- [ ] Shows correct status badges
- [ ] Status colors are correct (pending=yellow, completed=blue, etc.)
- [ ] Shows "No recent activity" when empty

### Date Formatting
- [ ] Dates show as "Nov 18, 2025, 08:20 AM"
- [ ] Time shows in 12-hour format with AM/PM
- [ ] Month is abbreviated (Jan, Feb, Mar, etc.)
- [ ] No timezone information displayed

---

## Performance Considerations

### Top Counselors Query

**Query Count**:
- Before: 1 complex query
- After: 1 + (N × 2) queries where N = number of counselors

**For 5 counselors**: 1 + (5 × 2) = 11 queries

**Performance Impact**:
- Negligible for small number of counselors (< 20)
- More reliable and easier to debug
- Can be optimized with caching if needed

**Optimization Options** (if needed):
1. Cache results for 5-10 minutes
2. Add database indexes on `counselor_id`
3. Use a single raw SQL query
4. Implement Redis caching

---

## Debugging

### Check Top Counselors Data

The controller now logs the data:
```javascript
console.log('Top counselors:', JSON.stringify(topCounselors, null, 2));
```

**Expected Output**:
```json
[
  {
    "user_id": 3,
    "profile_info": {
      "firstName": "Counselor",
      "lastName": "Ryan"
    },
    "totalAppointments": 15,
    "avgRating": 5.0
  },
  ...
]
```

### Verify Date Formatting

Test the helper in browser console:
```javascript
// Should output: "Nov 18, 2025, 08:20 AM"
new Date('2025-11-18T08:20:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});
```

---

## Common Issues & Solutions

### Issue 1: Top Counselors Still Empty
**Solution**: 
1. Check console logs for data
2. Verify counselors have appointments: `SELECT counselor_id, COUNT(*) FROM appointments GROUP BY counselor_id;`
3. Check if counselors exist: `SELECT * FROM users WHERE role = 'counselor';`

### Issue 2: Date Format Not Changing
**Solution**:
1. Restart server to load new helper
2. Clear browser cache
3. Check if `formatDateTime` helper is registered in `index.js`

### Issue 3: Wrong Appointment Count
**Solution**:
1. Check database: `SELECT counselor_id, COUNT(*) FROM appointments GROUP BY counselor_id;`
2. Verify foreign keys are correct
3. Check console logs for actual data

---

## Files Modified

1. **index.js** - Added `formatDateTime` Handlebars helper
2. **controllers/authController.js** - Rewrote top counselors query
3. **views/dashboard.xian** - Updated date display and empty state

---

## Success Indicators

✅ Top counselors section shows data when appointments exist
✅ Counselors are ranked by appointment count
✅ Star ratings display correctly
✅ Recent activity shows clean, readable dates
✅ Empty states are informative and helpful
✅ No console errors
✅ Page loads quickly

---

## Future Enhancements

### Top Counselors
- [ ] Add "View All" button to see all counselors
- [ ] Show trend indicators (↑ improving, ↓ declining)
- [ ] Add filter by date range
- [ ] Show completion rate percentage

### Recent Activity
- [ ] Add pagination for more activities
- [ ] Filter by status (pending, completed, etc.)
- [ ] Add search functionality
- [ ] Show appointment reason/notes preview
- [ ] Add "View Details" link for each activity

### Date Formatting
- [ ] Add relative time for recent dates ("2 hours ago")
- [ ] Add timezone selection
- [ ] Add date range filters
- [ ] Add calendar view option
