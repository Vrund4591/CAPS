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

// Get available students for team selection
router.get('/available-students', authenticateToken, authorizeRoles('STUDENT'), async (req, res) => {
  try {
    // Get all students who are not already in a group
    const availableStudents = await prisma.student.findMany({
      where: {
        groupMember: null // Students not in any group
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({ students: availableStudents });
  } catch (error) {
    console.error('Get available students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create group with team members (Students only)
router.post('/create', authenticateToken, authorizeRoles('STUDENT'), async (req, res) => {
  try {
    const { title, description, facultyId, projectType, frontendTech, backendTech, teamMemberIds = [] } = req.body;
    
    // Comprehensive user validation
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can create groups' });
    }
    
    if (!req.user.student) {
      return res.status(400).json({ 
        message: 'Student profile not found. Please contact administrator to complete your profile setup.',
        userInfo: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        }
      });
    }
    
    const studentId = req.user.student.id;
    
    // Validate required fields
    if (!title || !description || !facultyId || !projectType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

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

    // Validate team size (max 4 including leader)
    if (teamMemberIds.length > 3) {
      return res.status(400).json({ message: 'Maximum 4 members allowed in a group' });
    }

    // Check if all selected team members are available
    const memberStudents = await prisma.student.findMany({
      where: {
        id: { in: teamMemberIds },
        groupMember: null
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (memberStudents.length !== teamMemberIds.length) {
      return res.status(400).json({ message: 'Some selected students are already in a group' });
    }

    const groupId = await generateGroupId();

    // Create group with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create group
      const group = await tx.group.create({
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
      await tx.groupMember.create({
        data: {
          studentId,
          groupId: group.id,
          isLeader: true
        }
      });

      // Add selected team members
      if (teamMemberIds.length > 0) {
        await tx.groupMember.createMany({
          data: teamMemberIds.map(memberId => ({
            studentId: memberId,
            groupId: group.id,
            isLeader: false
          }))
        });
      }

      return { group, memberStudents };
    });

    // Prepare team member names for notification
    const teamMemberNames = memberStudents.map(student => student.user.name).join(', ');
    const teamInfo = teamMemberNames ? ` with team members: ${teamMemberNames}` : '';

    // Create notification for faculty
    await prisma.notification.create({
      data: {
        title: 'New Group Request',
        message: `New group "${title}" created by ${req.user.name}${teamInfo} is waiting for your approval.`,
        type: 'GROUP_REQUEST',
        recipientEmail: result.group.faculty.user.email
      }
    });

    // Create notifications for team members
    if (memberStudents.length > 0) {
      await prisma.notification.createMany({
        data: memberStudents.map(student => ({
          title: 'Added to Group',
          message: `You have been added to group "${title}" by ${req.user.name}. Waiting for faculty approval.`,
          type: 'GROUP_INVITATION',
          recipientEmail: student.user.email
        }))
      });
    }

    res.status(201).json({
      message: 'Group created successfully',
      group: result.group
    });

  } catch (error) {
    console.error('Group creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join group (keeping existing functionality for students who want to join later)
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
        },
        members: {
          include: {
            student: {
              include: { user: true }
            }
          }
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

    // Create notifications for all group members
    const allMembers = group.members.map(member => member.student.user.email);
    
    await prisma.notification.createMany({
      data: allMembers.map(email => ({
        title: `Group ${status}`,
        message: `Your group "${group.title}" has been ${status.toLowerCase()} by faculty.`,
        type: 'GROUP_UPDATE',
        recipientEmail: email
      }))
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
