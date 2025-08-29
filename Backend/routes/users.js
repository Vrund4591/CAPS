const express = require('express');
const { prisma } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all faculty (for group creation)
router.get('/faculty', authenticateToken, async (req, res) => {
  try {
    const faculty = await prisma.faculty.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({ faculty });
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all students (Admin only)
router.get('/students', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({ students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add authorized user (Admin only)
router.post('/authorize', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { email, role } = req.body;

    const authorizedUser = await prisma.authorizedUser.create({
      data: { email, role }
    });

    res.status(201).json({
      message: 'User authorized successfully',
      authorizedUser
    });
  } catch (error) {
    console.error('Authorize user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics (Admin only)
router.get('/stats', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalStudents = await prisma.student.count();
    const totalFaculty = await prisma.faculty.count();
    const totalAdmins = await prisma.user.count({
      where: { role: 'ADMIN' }
    });

    res.json({
      totalUsers,
      totalStudents,
      totalFaculty,
      totalAdmins
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
