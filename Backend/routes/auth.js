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
