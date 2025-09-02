const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, ...additionalData } = req.body;

    // Check if user is authorized to register
    const authorizedUser = await prisma.authorizedUser.findFirst({
      where: { email, role, isUsed: false }
    });

    if (!authorizedUser) {
      return res.status(403).json({ 
        message: 'Registration requires pre-authorization. Please contact your administrator to authorize your email address for registration.',
        details: 'Your email must be pre-authorized by an administrator before you can create an account.'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role
        }
      });

      // Create role-specific record
      if (role === 'STUDENT') {
        await tx.student.create({
          data: {
            userId: user.id,
            enrollmentNo: additionalData.enrollmentNo,
            class: additionalData.class,
            division: additionalData.division,
            semester: parseInt(additionalData.semester),
            phoneNumber: additionalData.phoneNumber
          }
        });
      } else if (role === 'FACULTY') {
        await tx.faculty.create({
          data: {
            userId: user.id,
            department: additionalData.department
          }
        });
      } else if (role === 'ADMIN') {
        await tx.admin.create({
          data: { userId: user.id }
        });
      }

      // Mark authorized user as used
      await tx.authorizedUser.update({
        where: { id: authorizedUser.id },
        data: { isUsed: true }
      });

      return user;
    });

    // Send welcome email
    const welcomeContent = `
      <p class="content">Dear ${name},</p>
      <p class="content">🎉 <strong>Welcome to the CAPS family!</strong> Your account has been successfully created and you're ready to start your collaborative journey.</p>
      
      <div class="info-box">
        <div class="info-item">
          <div class="info-label">Name</div>
          <div class="info-value">${name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value">${email}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Role</div>
          <div class="info-value">${role}</div>
        </div>
        ${role === 'STUDENT' ? `
          <div class="info-item">
            <div class="info-label">Enrollment No</div>
            <div class="info-value">${additionalData.enrollmentNo}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Class</div>
            <div class="info-value">${additionalData.class}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Division</div>
            <div class="info-value">${additionalData.division}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Semester</div>
            <div class="info-value">${additionalData.semester}</div>
          </div>
        ` : ''}
        ${role === 'FACULTY' ? `
          <div class="info-item">
            <div class="info-label">Department</div>
            <div class="info-value">${additionalData.department}</div>
          </div>
        ` : ''}
      </div>
      
      <span class="success-badge">✅ Account Created Successfully!</span>
      
      <p class="content">You can now log in to the CAPS system and start ${role === 'STUDENT' ? 'creating or joining groups for awesome projects' : 'managing groups and mentoring brilliant students'}! 🚀</p>
      
      <a href="#" class="cta-button">Start Your Journey</a>
      
      <p class="content" style="margin-top: 30px;">Ready to make some magic happen? Let's build something amazing together! 💪</p>
    `;

    const welcomeEmailHTML = global.createCAPSEmailTemplate(
      'Welcome to CAPS! 🎓', 
      welcomeContent,
      '#10B981'
    );

    await global.sendEmail(email, 'Welcome to CAPS System - Let\'s Get Started!', welcomeEmailHTML);

    const token = generateToken(result.id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: result.id, email: result.email, name: result.name, role: result.role }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        student: true,
        faculty: true,
        admin: true
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Send login notification email
    const loginContent = `
      <p class="content">Hey ${user.name}! 👋</p>
      <p class="content">We just wanted to let you know that you've successfully logged into your CAPS account.</p>
      
      <div class="info-box">
        <div class="info-item">
          <div class="info-label">Login Time</div>
          <div class="info-value">${new Date().toLocaleString()}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Role</div>
          <div class="info-value">${user.role}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Status</div>
          <div class="info-value">✅ Secure Login Successful</div>
        </div>
      </div>
      
      <span class="success-badge">🔐 Secure Access Confirmed</span>
      
      <p class="content">If this wasn't you, please contact the administrator immediately! Otherwise, have an awesome session! 🌟</p>
      
      <p class="content" style="margin-top: 20px; font-size: 14px; color: #6B7280;">
        <strong>Security Tip:</strong> Always log out when using shared computers! 🛡️
      </p>
    `;

    const loginEmailHTML = global.createCAPSEmailTemplate(
      'Secure Login Detected! 🔐', 
      loginContent,
      '#3B82F6'
    );

    await global.sendEmail(email, 'CAPS Login Notification - Welcome Back!', loginEmailHTML);

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.student || user.faculty || user.admin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      profile: req.user.student || req.user.faculty || req.user.admin
    }
  });
});

module.exports = router;
