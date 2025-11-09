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
    
import dotenv from "dotenv";
import express from "express";
import path from "path";
import session from "express-session";
import flash from "connect-flash";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import fs from 'fs';
import hbs from "hbs";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname } from "path";
import sequelize from "./config/database.js";
import './models/index.js'; // Import to initialize models and associations

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/bootstrap', express.static(path.join(process.cwd(), 'node_modules/bootstrap/dist')));
app.use('/fontawesome', express.static(path.join(process.cwd(), 'node_modules/@fortawesome/fontawesome-free')));
app.use('/logo', express.static(path.join(process.cwd(), 'logo')));
app.use(express.static(path.join(process.cwd(), "public")));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || "xianfire-secret-key",
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

// Register a Handlebars helper to check for equality
hbs.registerHelper('eq', function (a, b) {
  return a === b;
});

// Register a Handlebars helper for the current year
hbs.registerHelper('currentYear', function () {
  return new Date().getFullYear();
});

// Register a Handlebars helper to stringify JSON
hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

// Register logical and comparison helpers
hbs.registerHelper('and', function() {
    return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
});

hbs.registerHelper('not', function(value) {
    return !value;
});

hbs.registerHelper('gte', function (a, b) {
    return a >= b;
});

// Register formatting and iteration helpers
hbs.registerHelper('toFixed', function (number, digits) {
    return Number(number).toFixed(digits);
});

hbs.registerHelper('times', function (n, block) {
    // If used as a block helper: {{#times 5}}...{{/times}}
    if (block && block.fn) {
        let accum = '';
        for (let i = 1; i <= n; ++i) {
            accum += block.fn(i);
        }
        return accum;
    }
    // If used as a subexpression: {{#each (times 5)}}
    const result = [];
    for (let i = 1; i <= n; ++i) {
        result.push(i);
    }
    return result;
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "xian");
app.engine('xian', hbs.__express);

// Recursively find all .xian files and register them as partials
const registerPartials = (dir, baseDir = dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // Recurse into subdirectory
      registerPartials(fullPath, baseDir);
    } else if (file.endsWith('.xian')) {
      // Register the partial
      const partialName = path.relative(baseDir, fullPath).replace(/\\/g, '/').replace('.xian', '');
      const template = fs.readFileSync(fullPath, 'utf8');
      hbs.registerPartial(partialName, template);
    }
  });
};

try {
  const viewsDir = path.join(__dirname, 'views');
  registerPartials(viewsDir);
  // Also register partials from the old partials directory if it exists
  const oldPartialsDir = path.join(__dirname, "views/partials");
  if (fs.existsSync(oldPartialsDir)) {
    registerPartials(oldPartialsDir, oldPartialsDir);
  }
} catch (err) {
  console.error("❌ Error registering partials:", err);
}

app.use("/", router);

export default app;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');

    // Socket.io connection logic
    io.on('connection', (socket) => {
      console.log('🔌 A user connected');
      socket.on('disconnect', () => {
        console.log('🔌 User disconnected');
      });

      // Join a room based on user ID
      socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      });
    });

    httpServer.listen(PORT, () => console.log(`🔥 XianFire running at http://localhost:${PORT}`));
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

if (!process.env.ELECTRON) {
  startServer();
}
