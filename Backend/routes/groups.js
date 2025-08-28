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
    const { status, rejectionReason } = req.body; // Added rejectionReason
    const facultyId = req.user.faculty.id;

    // Validate status
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be APPROVED or REJECTED' });
    }

    // Validate rejection reason if status is REJECTED
    if (status === 'REJECTED' && (!rejectionReason || rejectionReason.trim().length === 0)) {
      return res.status(400).json({ message: 'Rejection reason is required when rejecting a group' });
    }

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
        },
        faculty: {
          include: { user: true }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or you are not authorized to modify this group' });
    }

    if (group.status !== 'PENDING') {
      return res.status(400).json({ message: 'Group status has already been decided' });
    }

    const updateData = {
      status: status === 'APPROVED' ? 'ACTIVE' : 'REJECTED'
    };

    // Add rejection reason if provided
    if (status === 'REJECTED' && rejectionReason) {
      updateData.rejectionReason = rejectionReason.trim();
    }

    const updatedGroup = await prisma.group.update({
      where: { id: group.id },
      data: updateData
    });

    // Create notifications for all group members
    const allMembers = group.members.map(member => member.student.user.email);
    
    let notificationTitle, notificationMessage;
    
    if (status === 'APPROVED') {
      notificationTitle = 'Group Approved! 🎉';
      notificationMessage = `Congratulations! Your group "${group.title}" has been approved by Prof. ${group.faculty.user.name}. You can now start working on your project.`;
    } else {
      notificationTitle = 'Group Request Rejected';
      notificationMessage = `Your group "${group.title}" has been rejected by Prof. ${group.faculty.user.name}.\n\nReason: ${rejectionReason}\n\nYou can create a new group with the necessary improvements.`;
    }

    await prisma.notification.createMany({
      data: allMembers.map(email => ({
        title: notificationTitle,
        message: notificationMessage,
        type: status === 'APPROVED' ? 'GROUP_APPROVED' : 'GROUP_REJECTED',
        recipientEmail: email
      }))
    });

    res.json({
      message: `Group ${status.toLowerCase()} successfully`,
      group: updatedGroup
    });

  } catch (error) {
    console.error('Update group status error:', error);
    res.status(500).json({ message: 'Server error while updating group status' });
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

// Delete group (Students only - for pending or rejected groups)
router.delete('/:groupId/delete', authenticateToken, authorizeRoles('STUDENT'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const studentId = req.user.student.id;

    // Find the group and verify ownership and status
    const group = await prisma.group.findFirst({
      where: { 
        groupId,
        teamLeaderId: studentId,
        status: { in: ['PENDING', 'REJECTED'] } // Allow deletion of both pending and rejected groups
      },
      include: {
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
      return res.status(404).json({ 
        message: 'Group not found, not owned by you, or cannot be deleted (only pending or rejected groups can be deleted)' 
      });
    }

    // Delete group and all related data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all group members
      await tx.groupMember.deleteMany({
        where: { groupId: group.id }
      });

      // Delete any notifications related to this group
      await tx.notification.deleteMany({
        where: {
          OR: [
            { message: { contains: group.title } },
            { type: { in: ['GROUP_REQUEST', 'GROUP_INVITATION', 'GROUP_REJECTED', 'GROUP_APPROVED'] } }
          ]
        }
      });

      // Delete the group itself
      await tx.group.delete({
        where: { id: group.id }
      });
    });

    // Send notifications to all members about group deletion
    const memberEmails = group.members
      .filter(member => !member.isLeader) // Exclude the leader who initiated deletion
      .map(member => member.student.user.email);
    
    if (memberEmails.length > 0) {
      await prisma.notification.createMany({
        data: memberEmails.map(email => ({
          title: 'Group Deleted',
          message: `The group "${group.title}" has been deleted by the team leader. You are now available to join other groups.`,
          type: 'GROUP_DELETED',
          recipientEmail: email
        }))
      });
    }

    // Notify faculty if the group was pending (so they know the request is no longer valid)
    if (group.status === 'PENDING') {
      const facultyResponse = await prisma.faculty.findUnique({
        where: { id: group.facultyId },
        include: { user: true }
      });
      
      if (facultyResponse) {
        await prisma.notification.create({
          data: {
            title: 'Group Request Withdrawn',
            message: `The group "${group.title}" request has been withdrawn by the team leader ${req.user.name}.`,
            type: 'GROUP_WITHDRAWN',
            recipientEmail: facultyResponse.user.email
          }
        });
      }
    }

    res.json({ 
      message: 'Group deleted successfully. You can now create a new group.',
      deletedGroupId: groupId
    });

  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error while deleting group' });
  }
});

// Get members from rejected group for editing purposes
router.post('/rejected-group-members', authenticateToken, authorizeRoles('STUDENT'), async (req, res) => {
  try {
    const { memberIds } = req.body;
    
    if (!memberIds || !Array.isArray(memberIds)) {
      return res.json({ students: [] });
    }

    // Fetch the students who were in the rejected group
    const students = await prisma.student.findMany({
      where: {
        id: { in: memberIds }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({ students });
  } catch (error) {
    console.error('Get rejected group members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
