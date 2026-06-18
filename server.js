const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const Application = require('./models/application');
const User = require('./models/user');

const app = express();

// Middleware Engine Mounting
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Cloud Instance Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Cloud Cluster Connected Successfully...'))
    .catch(err => console.error('Database connection exception:', err));

// 📧 NODEMAILER DISPATCH MAIL CARRIER TRANSPORTER (Bypasses Render Firewall Restrictions)
// 📧 NODEMAILER DISPATCH MAIL CARRIER TRANSPORTER (Optimized for Render Cloud Engine)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // Use secure port directly 
    secure: true, // Must be TRUE for port 465. Forces immediate SSL connection.
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false, // Bypasses Render proxy network handshake blocks
        minVersion: "TLSv1.2"
    }
});

// Always verify the connection configuration on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Render Nodemailer Connection Error Summary:', error.message);
    } else {
        console.log('🚀 Cloud Server connected to Gmail. Ready to dispatch emails!');
    }
});

// Admin Account Registration Email Dispatches
const sendAdminEmail = async (destEmail, uniqueName, accessNumber) => {
    const mailOptions = {
        from: `"Apex University Portal" <${process.env.EMAIL_USER}>`,
        to: destEmail,
        subject: 'Your Unique Administrative Access Credentials',
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #334155;">
                <h2 style="color: #1a252f; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Registration Complete</h2>
                <p>Hello,</p>
                <p>Your administrative account has been provisioned successfully. For security reasons, you must use these system-generated unique credentials to access the console panel:</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3498db;">
                    <p style="margin: 5px 0;"><strong>Assigned Unique Name:</strong> <code style="color: #e74c3c; font-size: 16px;">${uniqueName}</code></p>
                    <p style="margin: 5px 0;"><strong>Unique Access Number:</strong> <code style="color: #e74c3c; font-size: 16px;">${accessNumber}</code></p>
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">Apex Global University Automation Engines • 2026</p>
            </div>
        `
    };
    await transporter.sendMail(mailOptions);
};

// Student Enrollment Acceptance Email Dispatches
const sendStudentApprovalEmail = async (destEmail, studentName, uniqueName, accessNumber) => {
    const mailOptions = {
        from: `"Apex Admissions Desk" <${process.env.EMAIL_USER}>`,
        to: destEmail,
        subject: 'Congratulations! Your Admission Application is Approved',
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #334155;">
                <h2 style="color: #2ecc71; border-bottom: 2px solid #2ecc71; padding-bottom: 10px;">Admission Offer Approved 🎉</h2>
                <p>Dear ${studentName},</p>
                <p>We are pleased to inform you that your registration profile has been officially reviewed and approved by the admissions panel. Your institutional workspace credentials have been provisioned below:</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2ecc71;">
                    <p style="margin: 5px 0;"><strong>Assigned Unique Name:</strong> <code style="color: #3498db; font-size: 16px;">${uniqueName}</code></p>
                    <p style="margin: 5px 0;"><strong>Unique Access Number:</strong> <code style="color: #3498db; font-size: 16px;">${accessNumber}</code></p>
                </div>
                <p>Please click on the <strong>Student Hub</strong> link on our homepage and use these parameters to enter your dashboard panel.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">Apex Global University Campus Office • 2026</p>
            </div>
        `
    };
    await transporter.sendMail(mailOptions);
};

// --- JWT AUTHORIZATION TOKEN UTILITIES ---
const generateTokens = (user) => {
    const accessToken = jwt.sign({
            id: user._id,
            username: user.username,
            role: user.role
        },
        process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '15m'
        }
    );
    const refreshToken = jwt.sign({
            id: user._id
        },
        process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: '7d'
        }
    );
    return {
        accessToken,
        refreshToken
    };
};

const setCookies = (res, accessToken, refreshToken) => {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000
    });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

// --- SECURE AUTH MIDDLEWARE (HANDLES REDIRECTS VS API RESTRICTS) ---
const verifyRole = (role) => {
    return async (req, res, next) => {
        const {
            accessToken,
            refreshToken
        } = req.cookies;
        const isApiRequest = req.originalUrl.startsWith('/api/');

        if (!accessToken) {
            return tryRefresh(req, res, next, refreshToken, role, isApiRequest);
        }

        try {
            const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
            if (role && decoded.role !== role) {
                if (isApiRequest) {
                    return res.status(403).json({
                        success: false,
                        message: 'Forbidden: Insufficient privileges.'
                    });
                }
                return res.status(403).send('<h1>403 Forbidden</h1><p>You do not have access privileges for this workspace panel.</p>');
            }
            req.user = decoded;
            next();
        } catch (err) {
            return tryRefresh(req, res, next, refreshToken, role, isApiRequest);
        }
    };
};

const tryRefresh = async (req, res, next, refreshToken, requiredRole, isApiRequest) => {
    if (!refreshToken) {
        if (isApiRequest) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Session credentials expired.'
            });
        }
        return res.redirect(requiredRole === 'admin' ? '/admin-login' : '/student-login');
    }
    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.role !== requiredRole) throw new Error('Token verification failed');

        const tokens = generateTokens(user);
        setCookies(res, tokens.accessToken, tokens.refreshToken);
        req.user = jwt.verify(tokens.accessToken, process.env.ACCESS_TOKEN_SECRET);
        next();
    } catch (err) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        if (isApiRequest) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Invalid authentication state.'
            });
        }
        return res.redirect(requiredRole === 'admin' ? '/admin-login' : '/student-login');
    }
};

// --- MULTI-VIEW HTML RENDERING ROUTINGS (SECURED ENTRY GATES) ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'views', 'index.html')));
app.get('/apply', (req, res) => res.sendFile(path.resolve(__dirname, 'views', 'apply.html')));
app.get('/student-login', (req, res) => res.sendFile(path.resolve(__dirname, 'views', 'student-login.html')));
app.get('/admin-login', (req, res) => res.sendFile(path.resolve(__dirname, 'views', 'admin-login.html')));
app.get('/admin-register', (req, res) => res.sendFile(path.resolve(__dirname, 'views', 'admin-register.html')));

// Guarded Structural Dashboard Views (Direct URL manipulation blocked)
app.get('/admin', verifyRole('admin'), (req, res) => res.sendFile(path.resolve(__dirname, 'views', 'admin-dashboard.html')));
app.get('/student', verifyRole('student'), (req, res) => res.sendFile(path.resolve(__dirname, 'views', 'student-dashboard.html')));

// --- CORE SYSTEM API ACTIONS ---

// Student Submits Admission Application Form
app.post('/api/apply', async (req, res) => {
    try {
        const duplicated = await Application.findOne({
            email: req.body.email
        });
        if (duplicated) return res.status(400).send('<script>alert("Email already applied!"); window.history.back();</script>');

        const newApp = new Application(req.body);
        await newApp.save();
        res.send('<script>alert("Application logged!"); window.location.href="/";</script>');
    } catch (err) {
        res.status(500).send('API Error: ' + err.message);
    }
});

// Admin Registers for an Account
app.post('/api/admin/register', async (req, res) => {
    try {
        const {
            username,
            email,
            phone
        } = req.body;
        const exists = await User.findOne({
            username
        });
        if (exists) return res.json({
            success: false,
            message: 'Username already registered.'
        });

        const cleanName = username.toUpperCase().replace(/\s+/g, '');
        const phoneTail = phone.slice(-4);
        const uniqueName = `ADMIN-${cleanName}-${phoneTail}`;
        const accessNumber = Math.floor(10000 + Math.random() * 90000).toString();

        const admin = new User({
            username,
            email,
            phone,
            adminUniqueName: uniqueName,
            adminAccessNumber: accessNumber,
            role: 'admin'
        });
        await admin.save();
        await sendAdminEmail(email, uniqueName, accessNumber);
        res.json({
            success: true,
            message: 'Registration Successful! Your credentials have been emailed.'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    const {
        adminUniqueName,
        adminAccessNumber
    } = req.body;
    const user = await User.findOne({
        adminUniqueName,
        adminAccessNumber,
        role: 'admin'
    });
    if (!user) return res.json({
        success: false,
        message: 'Invalid Unique Admin Credentials'
    });
    const tokens = generateTokens(user);
    setCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({
        success: true
    });
});

// Student Login Verification Endpoint
app.post('/api/student/login', async (req, res) => {
    const {
        studentUniqueName,
        studentAccessNumber
    } = req.body;
    const user = await User.findOne({
        studentUniqueName,
        studentAccessNumber,
        role: 'student'
    });
    if (!user) {
        return res.json({
            success: false,
            message: 'Invalid Unique Student Credentials. Please verify parameters received via email.'
        });
    }
    const tokens = generateTokens(user);
    setCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({
        success: true
    });
});

// Fetch Applications Dashboard Queue (Admin Protected API)
app.get('/api/applications', verifyRole('admin'), async (req, res) => {
    const records = await Application.find();
    res.json(records);
});

// Admin Approval and Rejection Evaluator Handler (Admin Protected API)
app.post('/api/applications/:id/:action', verifyRole('admin'), async (req, res) => {
    const {
        id,
        action
    } = req.params;
    try {
        const appData = await Application.findById(id);
        if (!appData) return res.json({
            success: false,
            message: 'Application record not found.'
        });

        if (action === 'approve') {
            appData.status = 'Approved';
            await appData.save();

            const cleanStudName = appData.name.toUpperCase().replace(/\s+/g, '');
            const phoneTail = appData.phone.slice(-4);
            const studUniqueName = `STUD-${cleanStudName}-${phoneTail}`;
            const studAccessNumber = Math.floor(10000 + Math.random() * 90000).toString();

            await sendStudentApprovalEmail(appData.email, appData.name, studUniqueName, studAccessNumber);

            const studentUser = new User({
                username: appData.name.toLowerCase().replace(/\s+/g, '') + '-' + phoneTail,
                email: appData.email,
                phone: appData.phone,
                studentUniqueName: studUniqueName,
                studentAccessNumber: studAccessNumber,
                role: 'student'
            });
            await studentUser.save();

            return res.json({
                success: true,
                message: `Approved! Access credentials successfully emailed to: ${appData.email}`
            });
        }

        if (action === 'reject') {
            await Application.findByIdAndDelete(id);
            return res.json({
                success: true,
                message: 'Application denied and record deleted from system database.'
            });
        }
    } catch (err) {
        console.error("Admissions workflow error event detected:", err);
        res.json({
            success: false,
            message: 'Operational processing fault: ' + err.message
        });
    }
});

// Session Revocation Sign Out Handler
app.get('/api/logout', (req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Portal engine humming on port ${PORT}`));