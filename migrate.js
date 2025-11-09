
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
    
import sequelize from './config/database.js';
import inquirer from "inquirer";
import './models/index.js'; // This will import and define all models

(async () => {
  try {
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "This will sync all defined models to the database. Are you sure you want to continue?",
        default: false
      }
    ]);

    if (!confirm) {
      console.log("❌ Migration aborted by user.");
      process.exit(0);
    }

    console.log("🔄 Starting database synchronization...");
    await sequelize.sync({ alter: true }); // Use { force: true } to drop and recreate tables
    console.log("✅ Database synchronized successfully!");
  } catch (error) {
    console.error("❌ Failed to synchronize database:", error);
  } finally {
    await sequelize.close();
    process.exit();
  }
})();
