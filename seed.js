/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    This script seeds the database with a default administrator account.
*/

import sequelize from './config/database.js';
import { User } from './models/index.js';
import { Op } from 'sequelize';

const seedAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully for seeding.');

    const adminEmail = 'admin@counselink.minsu.ph';
    const adminPassword = 'admin123';

    // Find an existing admin user by either username or email to handle old data
    let adminUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: adminEmail },
          { email: adminEmail }
        ]
      }
    });

    if (adminUser) {
      // If user exists, ensure their details are correct
      adminUser.email = adminEmail;
      adminUser.username = adminEmail;
      adminUser.role = 'admin';
      adminUser.profile_info = {
        firstName: 'Admin',
        lastName: 'User',
        gender: 'Other'
      };
      await adminUser.setPassword(adminPassword); // Manually set and hash password
      await adminUser.save();
      console.log('ℹ️ Default admin user already exists. Ensured details are up-to-date.');
    } else {
      // If no user exists, create a new one
      await User.create({
        email: adminEmail,
        username: adminEmail,
        password: adminPassword,
        role: 'admin',
        profile_info: {
          firstName: 'Admin',
          lastName: 'User',
          gender: 'Other'
        }
      });
      console.log('✅ Default admin user "admin@counselink.minsu.ph" was created.');
    }

    // --- Seed Counselor Accounts ---
    const counselors = [
      {
        email: 'counselor@counselink.minsu.ph',
        password: 'counselor123',
        profile_info: { firstName: 'Default', lastName: 'Counselor', gender: 'Other' }
      }
    ];

    for (const counselor of counselors) {
      const [user, created] = await User.findOrCreate({
        where: { email: counselor.email },
        defaults: {
          username: counselor.email,
          password: counselor.password,
          role: 'counselor',
          profile_info: counselor.profile_info
        }
      });

      if (created) {
        console.log(`✅ Counselor account "${counselor.email}" was created.`);
      } else {
        // Ensure existing counselor has the correct role and info
        user.role = 'counselor';
        user.profile_info = counselor.profile_info;
        await user.setPassword(counselor.password); // Manually set and hash password
        await user.save();
        console.log(`ℹ️ Counselor account "${counselor.email}" already exists. Ensured details are up-to-date.`);
      }
    }

  } catch (error) {
    console.error('❌ Unable to seed the database:', error);
  } finally {
    await sequelize.close();
  }
};

seedAdmin();
