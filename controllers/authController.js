
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
    
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';
import { User, Appointment, Notification, Feedback } from "../models/index.js";
import sequelize from '../config/database.js';

export const loginPage = (req, res) => res.render("login", { title: "Login" });
export const registerPage = (req, res) => res.render("register", { title: "Register" });
export const forgotPasswordPage = (req, res) => res.render("forgotpassword", { title: "Forgot Password" });

export const dashboardPage = async (req, res) => {
  try {
    if (req.user.role === 'student') {
      // Get appointments with counselor ratings
      const allAppointments = await Appointment.findAll({
        where: { student_id: req.user.user_id },
        include: [
          {
            model: User,
            as: 'counselor',
            attributes: ['user_id', 'username', 'profile_info'],
            include: [{
              model: Feedback,
              as: 'receivedFeedback',
              attributes: []
            }]
          },
          'Feedback'
        ],
        attributes: {
          include: [
            [sequelize.fn('AVG', sequelize.col('counselor.receivedFeedback.rating')), 'counselorAvgRating']
          ]
        },
        group: ['Appointment.appointment_id', 'counselor.user_id', 'Feedback.feedback_id'],
        order: [['date_time', 'DESC']],
        subQuery: false
      }); 

      // Use direct database queries for stats for maximum reliability
      const pendingCount = await Appointment.count({ where: { student_id: req.user.user_id, status: 'pending' } });
      const approvedCount = await Appointment.count({ where: { student_id: req.user.user_id, status: 'approved' } });
      const completedCount = await Appointment.count({ where: { student_id: req.user.user_id, status: 'completed' } });

      const stats = {
        pending: pendingCount,
        approved: approvedCount,
        completed: completedCount,
      };

      return res.render("dashboard", { title: "Dashboard", user: req.user, appointments: allAppointments, stats, layout: 'layouts/main' });
    }
    
    if (req.user.role === 'admin') {
      const studentCount = await User.count({ where: { role: 'student' } });
      const counselorCount = await User.count({ where: { role: 'counselor' } });
      const appointmentCount = await Appointment.count();
      const pendingCount = await Appointment.count({ where: { status: 'pending' } });
      const completedCount = await Appointment.count({ where: { status: 'completed' } });
      const canceledCount = await Appointment.count({ where: { status: 'canceled' } });
      const lockedAccountsCount = await User.count({ where: { is_locked: true } });
      
      // Calculate completion rate
      const totalFinalized = completedCount + canceledCount;
      const completionRate = totalFinalized > 0 ? ((completedCount / totalFinalized) * 100).toFixed(1) : 0;
      
      // Get average rating across all counselors
      const avgRatingResult = await Feedback.findOne({
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
        raw: true
      });
      const averageRating = avgRatingResult?.avgRating ? parseFloat(avgRatingResult.avgRating).toFixed(1) : 'N/A';
      
      // Get feedback count
      const feedbackCount = await Feedback.count();
      const feedbackRate = completedCount > 0 ? ((feedbackCount / completedCount) * 100).toFixed(1) : 0;

      // --- Data for Charts ---
      const isPostgres = sequelize.options.dialect === 'postgres';
      const isMysql = sequelize.options.dialect === 'mysql';

      const appointmentStatusData = await Appointment.findAll({
          attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
          group: ['status']
      });

      // Analyze student issues/problems from appointment reasons
      const allAppointments = await Appointment.findAll({
          attributes: ['reason'],
          where: {
              reason: { [Op.ne]: null }
          },
          raw: true
      });

      // Categorize issues based on keywords in the reason
      const issueCategories = {
          'Academic Stress': ['academic', 'study', 'exam', 'test', 'grade', 'school', 'homework', 'assignment', 'class', 'course', 'failing'],
          'Mental Health': ['anxiety', 'depression', 'stress', 'mental', 'emotional', 'sad', 'worried', 'overwhelmed', 'burnout', 'panic'],
          'Family Issues': ['family', 'parent', 'home', 'sibling', 'mother', 'father', 'domestic'],
          'Relationship': ['relationship', 'boyfriend', 'girlfriend', 'friend', 'breakup', 'dating', 'love', 'partner'],
          'Career/Future': ['career', 'future', 'job', 'work', 'internship', 'graduation', 'college', 'university'],
          'Personal Issues': ['personal', 'self', 'confidence', 'identity', 'self-esteem', 'lonely', 'alone'],
          'Financial': ['financial', 'money', 'tuition', 'scholarship', 'allowance', 'budget'],
          'Health': ['health', 'sick', 'illness', 'medical', 'physical', 'sleep', 'eating'],
          'Social': ['social', 'peer', 'bullying', 'harassment', 'discrimination', 'friends'],
          'Other': []
      };

      const issueCounts = {};
      Object.keys(issueCategories).forEach(category => {
          issueCounts[category] = 0;
      });

      // Categorize each appointment reason
      allAppointments.forEach(appointment => {
          const reason = appointment.reason.toLowerCase();
          let categorized = false;

          for (const [category, keywords] of Object.entries(issueCategories)) {
              if (category === 'Other') continue;
              
              for (const keyword of keywords) {
                  if (reason.includes(keyword)) {
                      issueCounts[category]++;
                      categorized = true;
                      break;
                  }
              }
              if (categorized) break;
          }

          if (!categorized) {
              issueCounts['Other']++;
          }
      });

      // Filter out categories with 0 count and sort by count
      const studentIssues = Object.entries(issueCounts)
          .filter(([_, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8); // Top 8 issues

      // --- NEW: Data for Feedback Charts ---
      const counselorRatings = await User.findAll({
          where: { role: 'counselor' },
          attributes: [
              'profile_info',
              [sequelize.fn('AVG', sequelize.col('receivedFeedback.rating')), 'averageRating']
          ],
          include: [{
              model: Feedback,
              as: 'receivedFeedback',
              attributes: [],
              required: false // This ensures a LEFT JOIN
          }],
          group: ['User.user_id', 'User.profile_info'],
          order: isMysql
            ? [[sequelize.literal('averageRating IS NULL, averageRating DESC')]]
            : [[sequelize.literal('averageRating'), 'DESC NULLS LAST']],
          raw: true
      });

      const ratingDistribution = await Feedback.findAll({
          attributes: ['rating', [sequelize.fn('COUNT', sequelize.col('rating')), 'count']],
          group: ['rating'],
          order: [['rating', 'ASC']]
      });

      const chartData = {
          appointmentStatus: {
              labels: appointmentStatusData.map(item => item.status),
              data: appointmentStatusData.map(item => item.get('count'))
          },
          studentIssues: {
              labels: studentIssues.map(item => item[0]),
              data: studentIssues.map(item => item[1])
          },
          counselorRatings: {
              labels: counselorRatings.map(c => `${c['profile_info.firstName']} ${c['profile_info.lastName']}`),
              data: counselorRatings.map(c => c.averageRating)
          },
          ratingDistribution: {
              labels: ratingDistribution.map(r => `${r.rating} Star${r.rating > 1 ? 's' : ''}`),
              data: ratingDistribution.map(r => r.get('count'))
          }
      };

      // Get top performing counselors using a simpler approach
      let topCounselors = [];
      try {
        const allCounselors = await User.findAll({
          where: { role: 'counselor' },
          attributes: ['user_id', 'profile_info']
        });

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

        // Sort by total appointments (highest first)
        topCounselors.sort((a, b) => b.totalAppointments - a.totalAppointments);
        
        // Take top 5
        topCounselors = topCounselors.slice(0, 5);

        console.log('Top counselors:', JSON.stringify(topCounselors, null, 2));
      } catch (error) {
        console.error('Error fetching top counselors:', error);
        console.error('Error stack:', error.stack);
        topCounselors = [];
      }

      // Get recent activity (last 5 appointments)
      const recentActivity = await Appointment.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: ['student', 'counselor']
      });

      // Get recent appointments for the table (last 10)
      const recentAppointments = await Appointment.findAll({
        limit: 10,
        order: [['date_time', 'DESC']],
        include: ['student', 'counselor']
      });

      // Get locked accounts
      const lockedAccounts = await User.findAll({
        where: { is_locked: true },
        attributes: ['user_id', 'email', 'profile_info', 'role'],
        limit: 5
      });

      return res.render("dashboard", { 
        title: "Admin Dashboard", 
        user: req.user, 
        stats: { 
          studentCount, 
          counselorCount, 
          appointmentCount, 
          pendingCount,
          completedCount,
          canceledCount,
          lockedAccountsCount,
          completionRate,
          averageRating,
          feedbackCount,
          feedbackRate
        }, 
        recentAppointments, 
        chartData,
        topCounselors,
        recentActivity,
        lockedAccounts,
        layout: 'layouts/admin' 
      });
    }

    if (req.user.role === 'counselor') {
      const allAppointments = await Appointment.findAll({
        where: { counselor_id: req.user.user_id },
        include: 'student',
        order: [['date_time', 'DESC']]
      });

      // Calculate stats for the counselor's dashboard
      const stats = {
        pending: allAppointments.filter(a => a.status === 'pending').length,
        upcoming: allAppointments.filter(a => a.status === 'approved' && new Date(a.date_time) > new Date()).length,
        completed: allAppointments.filter(a => a.status === 'completed').length
      };

      return res.render("dashboard", { 
        title: "Counselor Dashboard", 
        user: req.user, 
        appointments: allAppointments, 
        stats, 
        layout: 'layouts/main' 
      });
    }

    // Fallback for any other role or if no specific dashboard is defined
    res.render("dashboard", { title: "Dashboard", user: req.user, layout: 'layouts/main' });
  } catch (error) {
    console.error("Dashboard Error:", error);
    console.error("Error stack:", error.stack);
    req.flash('error_msg', 'Could not load the dashboard. Error: ' + error.message);
    res.render("dashboard", { title: "Dashboard", user: req.user, appointments: [], stats: {}, layout: 'layouts/main' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const loginIdentifier = req.body.email || req.body.username;
    const { password } = req.body;

    if (!loginIdentifier) {
      req.flash("error_msg", "Please enter your email.");
      return res.redirect("/login");
    }

    const user = await User.findOne({ where: { email: loginIdentifier } });

    if (!user) {
      req.flash("error_msg", "Invalid email or password.");
      req.flash("login_error", "true"); // Used for CSS animation
      return res.redirect("/login");
    }

    // Check if account is deactivated (only if column exists)
    if (user.is_active !== undefined && !user.is_active) {
      req.flash("error_msg", "Your account has been deactivated. Please contact an administrator.");
      return res.redirect("/login");
    }

    // Check if account is permanently locked
    if (user.is_locked) {
      req.flash("error_msg", "Your account is locked. Please contact an administrator.");
      return res.redirect("/login");
    }

    // Check if account is temporarily throttled
    if (user.lockout_until && new Date() < new Date(user.lockout_until)) {
      const waitTime = Math.ceil((new Date(user.lockout_until) - new Date()) / 1000);
      req.flash("error_msg", `Too many failed attempts. Please try again in ${waitTime} seconds.`);
      return res.redirect("/login");
    }

    const isMatch = await user.validPassword(password);

    if (isMatch) {
      // Successful login: reset counters and log in
      user.failed_login_attempts = 0;
      user.lockout_until = null;
      await user.save();

      const token = jwt.sign({ id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      req.flash("success_msg", "You are now logged in.");
      return res.redirect("/dashboard");
    } else {
      // Failed login: increment counter and apply logic
      user.failed_login_attempts += 1;
      let message = "Invalid email or password.";

      if (user.failed_login_attempts >= 9) {
        user.is_locked = true;
        message = "Your account has been locked due to too many failed login attempts. Please contact an administrator.";
        
        // Notify all administrators
        // FIX: Only attempt to send notifications if req.io exists (i.e., not in production on Vercel)
        if (req.io) {
            const admins = await User.findAll({ where: { role: 'admin' } });
            for (const admin of admins) {
                const notif = await Notification.create({
                    user_id: admin.user_id,
                    message: `User account for ${user.email} has been locked due to multiple failed login attempts.`
                });
                req.io.to(`user-${admin.user_id}`).emit('new-notification', { message: notif.message });
            }
        }

      } else if (user.failed_login_attempts === 6) {
        user.lockout_until = new Date(Date.now() + 60000); // 60 seconds
        message = "Too many failed attempts. Please try again in 60 seconds.";
      } else if (user.failed_login_attempts === 3) {
        user.lockout_until = new Date(Date.now() + 30000); // 30 seconds
        message = "Too many failed attempts. Please try again in 30 seconds.";
      }

      await user.save();
      req.flash("error_msg", message);
      req.flash("login_error", "true"); // Used for CSS animation
      return res.redirect("/login");
    }

  } catch (error) {
    console.error(error);
    res.status(500).send("Server error during login.");
  }
};

export const registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Join all error messages into a single string
      const errorMessages = errors.array().map(err => err.msg).join(' ');
      req.flash('error_msg', errorMessages);
      return res.redirect('/register');
    }
    const { firstName, lastName, email, student_id, password, gender, terms_agreed, role = 'student' } = req.body;

    if (terms_agreed !== 'on') {
        req.flash('error_msg', 'You must agree to the Terms and Conditions to create an account.');
        return res.redirect('/register');
    }
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      req.flash("error_msg", "An account with this email already exists.");
      return res.redirect("/register");
    }

    // Use email as the username, store names in profile_info
    await User.create({
      username: email,
      email,
      password,
      role,
      profile_info: {
        firstName,
        lastName,
        gender,
        student_id
      }
    });

    req.flash("success_msg", "Registration successful! Please log in.");
    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error during registration.");
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie('token');
  req.flash("success_msg", "You have been logged out.");
  res.redirect("/login");
};

// Middleware for authentication and authorization
export const protect = (roles = []) => async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findByPk(decoded.id);
        if (!req.user || (roles.length && !roles.includes(req.user.role))) {
            return res.status(403).send('Forbidden: You do not have access to this resource.');
        }
        next();
    } catch (err) {
        return res.redirect('/login');
    }
};
