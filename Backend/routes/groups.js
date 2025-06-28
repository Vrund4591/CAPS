const express = require('express');
const { prisma } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Generate next group ID
const generateGroupId = async () => {
  const lastGroup = await prisma.group.findFirst({
    orderBy: { groupId: 'desc' }
  });

  if (!lastGroup) return 'G1';
  
  const lastNumber = parseInt(lastGroup.groupId.substring(1));
  return `G${lastNumber + 1}`;
};

// Create group (Students only)
router.post('/create', authenticateToken, authorizeRoles('STUDENT'), async (req, res) => {
  try {
    const { title, description, facultyId, projectType, frontendTech, backendTech } = req.body;
    const studentId = req.user.student.id;

    // Check if student is already in a group
    const existingMembership = await prisma.groupMember.findFirst({
      where: { studentId }
    });

    if (existingMembership) {
      return res.status(400).json({ message: 'You are already a member of a group' });
    }

    // Validate faculty exists
    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId }
    });

    if (!faculty) {
      return res.status(400).json({ message: 'Faculty not found' });
    }

    const groupId = await generateGroupId();

    // Create group
    const group = await prisma.group.create({
      data: {
        groupId,
        title,
        description,
        projectType,
        frontendTech,
        backendTech,
        status: 'PENDING',
        teamLeaderId: studentId,
        facultyId
      },
      include: {
        faculty: {
          include: { user: true }
        },
        teamLeader: {
          include: { user: true }
        }
      }
    });

    // Add creator as group member and leader
    await prisma.groupMember.create({
      data: {
        studentId,
        groupId: group.id,
        isLeader: true
      }
    });

    // Create notification for faculty
    await prisma.notification.create({
      data: {
        title: 'New Group Request',
        message: `New group "${title}" created by ${req.user.name} is waiting for your approval.`,
        type: 'GROUP_REQUEST',
        recipientEmail: group.faculty.user.email
      }
    });

    res.status(201).json({
      message: 'Group created successfully',
      group
    });

  } catch (error) {
    console.error('Group creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join group
router.post('/:groupId/join', authenticateToken, authorizeRoles('STUDENT'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const studentId = req.user.student.id;

    // Check if student is already in a group
    const existingMembership = await prisma.groupMember.findFirst({
      where: { studentId }
    });

    if (existingMembership) {
      return res.status(400).json({ message: 'You are already a member of a group' });
    }

    // Find group
    const group = await prisma.group.findFirst({
      where: { groupId },
      include: { members: true }
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.status !== 'PENDING') {
      return res.status(400).json({ message: 'Cannot join this group' });
    }

    // Check if group is full (max 4 members)
    if (group.members.length >= 4) {
      return res.status(400).json({ message: 'Group is full' });
    }

    // Add member to group
    await prisma.groupMember.create({
      data: {
        studentId,
        groupId: group.id,
        isLeader: false
      }
    });

    res.json({ message: 'Successfully joined the group' });

  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all groups (for faculty and admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let where = {};

    if (req.user.role === 'FACULTY') {
      where.facultyId = req.user.faculty.id;
    }

    const groups = await prisma.group.findMany({
      where,
      include: {
        members: {
          include: {
            student: {
              include: { user: true }
            }
          }
        },
        faculty: {
          include: { user: true }
        },
        teamLeader: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ groups });

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve/Reject group (Faculty only)
router.patch('/:groupId/status', authenticateToken, authorizeRoles('FACULTY'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'
    const facultyId = req.user.faculty.id;

    const group = await prisma.group.findFirst({
      where: { groupId, facultyId },
      include: {
        teamLeader: {
          include: { user: true }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const updatedGroup = await prisma.group.update({
      where: { id: group.id },
      data: { status: status === 'APPROVED' ? 'ACTIVE' : 'REJECTED' }
    });

    // Create notification for team leader
    await prisma.notification.create({
      data: {
        title: `Group ${status}`,
        message: `Your group "${group.title}" has been ${status.toLowerCase()} by faculty.`,
        type: 'GROUP_UPDATE',
        recipientEmail: group.teamLeader.user.email
      }
    });

    res.json({
      message: `Group ${status.toLowerCase()} successfully`,
      group: updatedGroup
    });

  } catch (error) {
    console.error('Update group status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's group
router.get('/my-group', authenticateToken, authorizeRoles('STUDENT'), async (req, res) => {
  try {
    const studentId = req.user.student.id;

    const groupMember = await prisma.groupMember.findFirst({
      where: { studentId },
      include: {
        group: {
          include: {
            members: {
              include: {
                student: {
                  include: { user: true }
                }
              }
            },
            faculty: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!groupMember) {
      return res.status(404).json({ message: 'You are not part of any group' });
    }

    res.json({ group: groupMember.group });

  } catch (error) {
    console.error('Get my group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
