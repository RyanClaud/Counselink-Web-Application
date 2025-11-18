
  /*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
    
import express from "express";
import rateLimit from "express-rate-limit";
import { homePage } from "../controllers/homeController.js";
import { 
    loginPage, 
    registerPage, 
    forgotPasswordPage, 
    dashboardPage, 
    loginUser, 
    registerUser, 
    logoutUser,
    protect 
} from "../controllers/authController.js";
import {
    renderNewAppointmentPage,
    createAppointment,
    approveAppointment,
    completeAppointment,
    renderFeedbackPage,
    submitFeedback
} from "../controllers/appointmentController.js";
import {
    renderUserManagementPage,
    deactivateUser,
    reactivateUser,
    renderFeedbackOverview,
    unlockUser,
    renderAddUserPage,
    createUser,
    renderDailyReport
} from "../controllers/adminController.js";
import {
    renderRecordPage,
    saveRecord
} from "../controllers/recordController.js";
import {
    generateAppointmentReport
} from "../controllers/reportController.js";
import {
    renderSettingsPage,
    updateProfile,
    changePassword,
    renderMyFeedbackPage
} from "../controllers/userController.js";
import {
    markNotificationsAsRead
} from "../controllers/notificationController.js";
import loadUserNotifications from "../middleware/loadUserNotifications.js";

const router = express.Router();

// Public routes
router.get("/", homePage);
router.get("/login", loginPage);
router.post("/login", loginUser);
router.get("/register", registerPage);
router.post("/register", registerUser);
router.get("/forgot-password", forgotPasswordPage);
router.get("/logout", logoutUser);

// Protected routes
router.get("/dashboard", protect(), loadUserNotifications, dashboardPage);

// Settings routes (protected)
router.get("/settings", protect(), loadUserNotifications, renderSettingsPage);
router.post("/settings/profile", protect(), updateProfile);
router.get("/feedback/my-feedback", protect(['counselor']), renderMyFeedbackPage);
router.post("/settings/password", protect(), changePassword);

// Notification routes (protected)
router.post("/notifications/mark-read", protect(), markNotificationsAsRead);

// Appointment routes (protected)
router.get("/appointments/new", protect(['student']), renderNewAppointmentPage);
router.post("/appointments", protect(['student']), createAppointment);
router.get("/appointments/:id/approve", protect(['counselor']), approveAppointment);
router.get("/appointments/:id/complete", protect(['counselor']), completeAppointment);

// Feedback routes (protected)
router.get("/feedback/:appointment_id/new", protect(['student']), renderFeedbackPage);
router.post("/feedback/:appointment_id", protect(['student']), submitFeedback);

// Counseling Record routes (protected)
router.get("/records/:appointment_id/edit", protect(['counselor', 'admin']), renderRecordPage);
router.post("/records/:appointment_id", protect(['counselor']), saveRecord);

// Admin routes (protected)
router.get("/admin/users", protect(['admin']), loadUserNotifications, renderUserManagementPage);
router.post("/admin/users/:id/deactivate", protect(['admin']), deactivateUser);
router.post("/admin/users/:id/reactivate", protect(['admin']), reactivateUser);
router.post("/admin/users/:id/unlock", protect(['admin']), unlockUser);
router.get("/admin/feedback", protect(['admin']), renderFeedbackOverview);
router.get("/admin/users/add", protect(['admin']), renderAddUserPage);
router.post("/admin/users/add", protect(['admin']), createUser);
router.get("/admin/reports/daily", protect(['admin']), renderDailyReport);
router.get("/reports/appointments", protect(['admin']), generateAppointmentReport);

export default router;
