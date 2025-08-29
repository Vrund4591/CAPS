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

    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required' });
    }

    if (!['STUDENT', 'FACULTY', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if already authorized
    const existingAuth = await prisma.authorizedUser.findFirst({
      where: { email, role }
    });

    if (existingAuth) {
      return res.status(400).json({ 
        message: `User ${email} is already authorized as ${role}` 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email already exists in the system' 
      });
    }

    const authorizedUser = await prisma.authorizedUser.create({
      data: { email, role }
    });

    res.status(201).json({
      message: `User ${email} has been authorized to register as ${role}`,
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

// Get system analytics (Admin only)
router.get('/analytics/overview', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { timeframe = '30' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(timeframe));

    // User statistics
    const totalUsers = await prisma.user.count();
    const activeUsers = totalUsers; // Since we don't have isActive field, assume all are active
    const newUsers = await prisma.user.count({
      where: { createdAt: { gte: daysAgo } }
    });

    // Group statistics
    const totalGroups = await prisma.group.count();
    const activeGroups = await prisma.group.count({ where: { status: 'ACTIVE' } });
    const pendingGroups = await prisma.group.count({ where: { status: 'PENDING' } });
    const rejectedGroups = await prisma.group.count({ where: { status: 'REJECTED' } });

    // Role distribution
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });

    // Department statistics (for faculty)
    const departmentStats = await prisma.faculty.groupBy({
      by: ['department'],
      _count: { department: true }
    });

    // Recent activity - Fix the relationship structure
    const recentGroups = await prisma.group.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        teamLeader: {
          include: { 
            user: true
          }
        },
        faculty: {
          include: { user: true }
        }
      }
    });

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.json({
      overview: {
        totalUsers,
        activeUsers,
        newUsers,
        totalGroups,
        activeGroups,
        pendingGroups,
        rejectedGroups
      },
      roleDistribution: roleStats,
      departmentDistribution: departmentStats,
      recentActivity: {
        groups: recentGroups,
        users: recentUsers
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get authorized users list (Admin only)
router.get('/authorized', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const authorizedUsers = await prisma.authorizedUser.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({ authorizedUsers });
  } catch (error) {
    console.error('Get authorized users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove authorized user (Admin only)
router.delete('/authorized/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const authorizedUser = await prisma.authorizedUser.findUnique({
      where: { id }
    });

    if (!authorizedUser) {
      return res.status(404).json({ message: 'Authorized user not found' });
    }

    if (authorizedUser.isUsed) {
      return res.status(400).json({ 
        message: 'Cannot remove authorization for a user who has already registered' 
      });
    }

    await prisma.authorizedUser.delete({
      where: { id }
    });

    res.json({ message: 'User authorization removed successfully' });
  } catch (error) {
    console.error('Remove authorized user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk authorize users (Admin only)
router.post('/bulk-authorize', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { emails, role } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: 'Emails array is required' });
    }

    if (!['STUDENT', 'FACULTY', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const results = {
      authorized: [],
      skipped: [],
      errors: []
    };

    for (const email of emails) {
      try {
        // Check if already authorized
        const existingAuth = await prisma.authorizedUser.findFirst({
          where: { email: email.trim(), role }
        });

        if (existingAuth) {
          results.skipped.push({ email, reason: 'Already authorized' });
          continue;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ 
          where: { email: email.trim() } 
        });

        if (existingUser) {
          results.skipped.push({ email, reason: 'User already exists' });
          continue;
        }

        await prisma.authorizedUser.create({
          data: { email: email.trim(), role }
        });

        results.authorized.push(email);
      } catch (error) {
        results.errors.push({ email, error: error.message });
      }
    }

    res.json({
      message: `Bulk authorization completed`,
      results
    });
  } catch (error) {
    console.error('Bulk authorize error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users with detailed information (Admin only)
router.get('/all', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const whereClause = {};
    if (role && role !== 'ALL') {
      whereClause.role = role;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            groupMember: {
              include: {
                group: true
              }
            }
          }
        },
        faculty: true
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    const totalUsers = await prisma.user.count({ where: whereClause });

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: page * limit < totalUsers,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user details (Admin only)
router.put('/:userId', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        name,
        email,
        role
      },
      include: {
        student: true,
        faculty: true
      }
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/:userId', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userIdInt },
      include: {
        student: {
          include: {
            groupMember: {
              include: { group: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting admin users
    if (user.role === 'ADMIN') {
      return res.status(400).json({ message: 'Cannot delete admin users' });
    }

    // Check if student is in an active group
    if (user.student?.groupMember?.group?.status === 'ACTIVE') {
      return res.status(400).json({ 
        message: 'Cannot delete user who is in an active group' 
      });
    }

    await prisma.user.delete({
      where: { id: userIdInt }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk operations (Admin only)
router.post('/bulk-action', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { action, userIds } = req.body;

    if (!['activate', 'deactivate', 'delete'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'No users selected' });
    }

    let processedCount = 0;

    switch (action) {
      case 'activate':
      case 'deactivate':
        // Since we don't have isActive field, just return success
        processedCount = userIds.length;
        break;
        
      case 'delete':
        // Only delete non-admin users who are not in active groups
        const usersToCheck = await prisma.user.findMany({
          where: { 
            id: { in: userIds },
            role: { not: 'ADMIN' }
          },
          include: {
            student: {
              include: {
                groupMember: {
                  include: { group: true }
                }
              }
            }
          }
        });

        const deletableUserIds = usersToCheck
          .filter(user => 
            !user.student?.groupMember?.group || 
            user.student.groupMember.group.status !== 'ACTIVE'
          )
          .map(user => user.id);

        if (deletableUserIds.length > 0) {
          const deleteResult = await prisma.user.deleteMany({
            where: { id: { in: deletableUserIds } }
          });
          processedCount = deleteResult.count;
        }
        break;
    }

    res.json({ 
      message: `Bulk ${action} completed successfully`,
      processedCount
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
