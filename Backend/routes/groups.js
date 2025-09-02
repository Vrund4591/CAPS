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
    // Enhanced user validation with better error handling
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can access this endpoint' });
    }
    
    // Check if student profile exists, if not try to fetch it
    let studentProfile = req.user.student;
    if (!studentProfile) {
      studentProfile = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      if (!studentProfile) {
        return res.status(400).json({ 
          message: 'Student profile not found. Please contact administrator to complete your profile setup.',
          userInfo: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
          }
        });
      }
    }

    // Get all students who are not already in an active group
    const availableStudents = await prisma.student.findMany({
      where: {
        AND: [
          { id: { not: studentProfile.id } }, // Exclude current user
          {
            OR: [
              { groupMember: null }, // Students not in any group
              { 
                groupMember: {
                  group: {
                    status: 'REJECTED' // Students from rejected groups can join new groups
                  }
                }
              }
            ]
          }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { semester: 'asc' },
        { class: 'asc' },
        { user: { name: 'asc' } }
      ]
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
    
    // Enhanced user validation with better error handling
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can create groups' });
    }
    
    // Check if student profile exists, if not try to fetch it
    let studentProfile = req.user.student;
    if (!studentProfile) {
      studentProfile = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      if (!studentProfile) {
        return res.status(400).json({ 
          message: 'Student profile not found. Please contact administrator to complete your profile setup.',
          userInfo: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
          }
        });
      }
    }
    
    const studentId = studentProfile.id;
    
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

    // Send email to faculty
    const facultyContent = `
      <p class="content">Dear Prof. ${result.group.faculty.user.name},</p>
      <p class="content">🎯 <strong>Exciting news!</strong> A new group has been created and is eagerly waiting for your approval to start their amazing project journey!</p>
      
      <div class="info-box">
        <div class="info-item">
          <div class="info-label">Group Name</div>
          <div class="info-value">${title}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Group ID</div>
          <div class="info-value">${result.group.groupId}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Team Leader</div>
          <div class="info-value">${req.user.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Project Type</div>
          <div class="info-value">${projectType}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Total Members</div>
          <div class="info-value">${memberStudents.length + 1} students</div>
        </div>
        ${teamMemberNames ? `
          <div class="info-item">
            <div class="info-label">Team Members</div>
            <div class="info-value">${teamMemberNames}</div>
          </div>
        ` : ''}
      </div>
      
      <div style="background-color: #F3F4F6; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #7C3AED;">
        <div class="info-label">Project Description</div>
        <div style="color: #1F2937; font-weight: 600; margin-top: 5px;">${description}</div>
      </div>
      
      <span class="warning-badge">⏰ Awaiting Your Review</span>
      
      <p class="content">Please log in to the CAPS system to review this group and help these students start their collaborative journey! 🚀</p>
      
      <a href="#" class="cta-button">Review Group Now</a>
    `;

    const facultyEmailHTML = global.createCAPSEmailTemplate(
      'New Group Awaiting Approval! 📋', 
      facultyContent,
      '#7C3AED'
    );

    await global.sendEmail(result.group.faculty.user.email, `New Group Request - ${title}`, facultyEmailHTML);

    // Send email to team members
    if (memberStudents.length > 0) {
      for (const student of memberStudents) {
        const memberContent = `
          <p class="content">Hey ${student.user.name}! 🎉</p>
          <p class="content"><strong>Awesome news!</strong> You've been added to an exciting new group project by ${req.user.name}!</p>
          
          <div class="info-box">
            <div class="info-item">
              <div class="info-label">Group Name</div>
              <div class="info-value">${title}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Group ID</div>
              <div class="info-value">${result.group.groupId}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Team Leader</div>
              <div class="info-value">${req.user.name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Project Type</div>
              <div class="info-value">${projectType}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Faculty Guide</div>
              <div class="info-value">Prof. ${result.group.faculty.user.name}</div>
            </div>
          </div>
          
          <span class="warning-badge">⏳ Waiting for Faculty Approval</span>
          
          <p class="content">The group is currently waiting for faculty approval. You'll be notified as soon as the status changes. Get ready to create something amazing! 💪</p>
          
          <a href="#" class="cta-button">View Group Details</a>
        `;

        const memberEmailHTML = global.createCAPSEmailTemplate(
          'You\'re In a New Group! 🤝', 
          memberContent,
          '#2563EB'
        );

        await global.sendEmail(student.user.email, `Added to Group - ${title}`, memberEmailHTML);
      }
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
    
    let notificationTitle, notificationMessage, emailSubject, emailHTML;
    
    if (status === 'APPROVED') {
      notificationTitle = 'Group Approved! 🎉';
      notificationMessage = `Congratulations! Your group "${group.title}" has been approved by Prof. ${group.faculty.user.name}. You can now start working on your project.`;
      emailSubject = `🎉 Group Approved - ${group.title}`;
      emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">🎉 Congratulations! Your Group is Approved!</h2>
          <p>Dear Team,</p>
          <p>Great news! Your group has been approved and you can now start working on your project:</p>
          <div style="background-color: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="color: #065F46;">${group.title}</h3>
            <p><strong>Group ID:</strong> ${group.groupId}</p>
            <p><strong>Approved by:</strong> Prof. ${group.faculty.user.name}</p>
            <p><strong>Project Type:</strong> ${group.projectType}</p>
            <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">ACTIVE</span></p>
          </div>
          <p>You can now collaborate with your team members and start developing your project. Good luck!</p>
          <p>Best regards,<br>CAPS Team</p>
        </div>
      `;
    } else {
      notificationTitle = 'Group Request Rejected';
      notificationMessage = `Your group "${group.title}" has been rejected by Prof. ${group.faculty.user.name}.\n\nReason: ${rejectionReason}\n\nYou can create a new group with the necessary improvements.`;
      emailSubject = `Group Request Rejected - ${group.title}`;
      emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #DC2626;">Group Request Rejected</h2>
          <p>Dear Team,</p>
          <p>Unfortunately, your group request has been rejected:</p>
          <div style="background-color: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
            <h3 style="color: #991B1B;">${group.title}</h3>
            <p><strong>Group ID:</strong> ${group.groupId}</p>
            <p><strong>Rejected by:</strong> Prof. ${group.faculty.user.name}</p>
            <p><strong>Reason:</strong> ${rejectionReason}</p>
          </div>
          <p>Don't worry! You can create a new group with the necessary improvements. Please address the feedback and try again.</p>
          <p>Best regards,<br>CAPS Team</p>
        </div>
      `;
    }

    await prisma.notification.createMany({
      data: allMembers.map(email => ({
        title: notificationTitle,
        message: notificationMessage,
        type: status === 'APPROVED' ? 'GROUP_APPROVED' : 'GROUP_REJECTED',
        recipientEmail: email
      }))
    });

    // Send emails to all group members
    for (const email of allMembers) {
      if (status === 'APPROVED') {
        const approvalContent = `
          <p class="content">🎉 <strong>CONGRATULATIONS!</strong> 🎉</p>
          <p class="content">Your group "${group.title}" has been approved by Prof. ${group.faculty.user.name}! Time to turn those ideas into reality!</p>
          
          <div class="info-box">
            <div class="info-item">
              <div class="info-label">Group Name</div>
              <div class="info-value">${group.title}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Group ID</div>
              <div class="info-value">${group.groupId}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Approved by</div>
              <div class="info-value">Prof. ${group.faculty.user.name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Project Type</div>
              <div class="info-value">${group.projectType}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status</div>
              <div class="info-value">✅ ACTIVE & READY TO GO!</div>
            </div>
          </div>
          
          <span class="success-badge">🚀 Group Approved - Let's Build!</span>
          
          <p class="content">You can now collaborate with your team members and start developing your project. The sky's the limit! 🌟</p>
          
          <a href="#" class="cta-button">Start Working</a>
          
          <p class="content" style="margin-top: 30px; color: #059669; font-weight: bold;">
            Pro tip: Great teamwork makes the dream work! 💪
          </p>
        `;

        const approvalEmailHTML = global.createCAPSEmailTemplate(
          'Group Approved! 🎉', 
          approvalContent,
          '#10B981'
        );

        await global.sendEmail(email, `🎉 Group Approved - ${group.title}`, approvalEmailHTML);
      } else {
        const rejectionContent = `
          <p class="content">Hey team,</p>
          <p class="content">We have an update about your group "${group.title}". While it hasn't been approved this time, don't worry - this is just a stepping stone to making it even better! 💪</p>
          
          <div class="info-box">
            <div class="info-item">
              <div class="info-label">Group Name</div>
              <div class="info-value">${group.title}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Group ID</div>
              <div class="info-value">${group.groupId}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Reviewed by</div>
              <div class="info-value">Prof. ${group.faculty.user.name}</div>
            </div>
          </div>
          
          <div style="background-color: #FEF2F2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #EF4444;">
            <div class="info-label" style="color: #DC2626;">Feedback for Improvement</div>
            <div style="color: #1F2937; font-weight: 600; margin-top: 10px; line-height: 1.6;">${rejectionReason}</div>
          </div>
          
          <span class="error-badge">📝 Needs Improvement</span>
          
          <p class="content">Don't let this discourage you! Use this feedback to create an even better proposal. Every great project starts with iterations! 🌟</p>
          
          <a href="#" class="cta-button">Create New Group</a>
          
          <p class="content" style="margin-top: 30px; color: #7C3AED; font-weight: bold;">
            Remember: The best projects come from the best preparations! 🎯
          </p>
        `;

        const rejectionEmailHTML = global.createCAPSEmailTemplate(
          'Group Feedback Received 📝', 
          rejectionContent,
          '#EF4444'
        );

        await global.sendEmail(email, `Group Feedback - ${group.title}`, rejectionEmailHTML);
      }
    }

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
    // Enhanced user validation
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Check if student profile exists, if not try to fetch it
    let studentProfile = req.user.student;
    if (!studentProfile) {
      studentProfile = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      if (!studentProfile) {
        return res.status(400).json({ 
          message: 'Student profile not found. Please contact administrator to complete your profile setup.',
          userInfo: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
          }
        });
      }
    }
    
    const studentId = studentProfile.id;

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
    
    // Enhanced user validation
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Check if student profile exists, if not try to fetch it
    let studentProfile = req.user.student;
    if (!studentProfile) {
      studentProfile = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      if (!studentProfile) {
        return res.status(400).json({ 
          message: 'Student profile not found. Please contact administrator to complete your profile setup.',
          userInfo: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
          }
        });
      }
    }
    
    const studentId = studentProfile.id;

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

// Get email addresses for selected groups (Faculty only)
router.post('/emails', authenticateToken, authorizeRoles('FACULTY'), async (req, res) => {
  try {
    const { groupIds } = req.body;
    const facultyId = req.user.faculty.id;

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ message: 'Group IDs are required' });
    }

    // Get all group members from the selected groups that belong to this faculty
    const groups = await prisma.group.findMany({
      where: {
        id: { in: groupIds },
        facultyId: facultyId // Ensure faculty can only get emails from their own groups
      },
      include: {
        members: {
          include: {
            student: {
              include: {
                user: {
                  select: { email: true }
                }
              }
            }
          }
        }
      }
    });

    // Extract unique email addresses
    const emailSet = new Set();
    groups.forEach(group => {
      group.members.forEach(member => {
        emailSet.add(member.student.user.email);
      });
    });

    const emails = Array.from(emailSet).sort();

    res.json({ 
      emails,
      groupCount: groups.length,
      studentCount: emails.length
    });

  } catch (error) {
    console.error('Get group emails error:', error);
    res.status(500).json({ message: 'Server error while fetching email addresses' });
  }
});

// Get available students for faculty (includes all students)
router.get('/available-students-faculty', authenticateToken, authorizeRoles('FACULTY'), async (req, res) => {
  try {
    // Get all students (not just available ones) so faculty can reassign
    const allStudents = await prisma.student.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        groupMember: {
          include: {
            group: {
              select: { id: true, title: true, status: true }
            }
          }
        }
      }
    });

    res.json({ students: allStudents });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update group information and members (Faculty only)
router.put('/:groupId/update-faculty', authenticateToken, authorizeRoles('FACULTY'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, description, projectType, frontendTech, backendTech, status, members } = req.body;
    const facultyId = req.user.faculty.id;

    // Validate required fields
    if (!title || !description || !projectType || !members || members.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate status
    if (!['PENDING', 'ACTIVE', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Find the group and verify faculty ownership
    const existingGroup = await prisma.group.findFirst({
      where: { groupId, facultyId },
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

    if (!existingGroup) {
      return res.status(404).json({ message: 'Group not found or you are not authorized to modify this group' });
    }

    // Validate team size
    if (members.length > 4) {
      return res.status(400).json({ message: 'Maximum 4 members allowed in a group' });
    }

    // Ensure there's exactly one leader
    const leaders = members.filter(member => member.isLeader);
    if (leaders.length !== 1) {
      return res.status(400).json({ message: 'Group must have exactly one leader' });
    }

    // Validate all student IDs exist
    const studentIds = members.map(member => member.studentId);
    const existingStudents = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        groupMember: {
          include: {
            group: { select: { id: true, groupId: true, title: true } }
          }
        }
      }
    });

    if (existingStudents.length !== studentIds.length) {
      return res.status(400).json({ message: 'Some selected students do not exist' });
    }

    // Check for conflicts with other groups (excluding current group)
    const conflictingStudents = existingStudents.filter(student => 
      student.groupMember && student.groupMember.group.id !== existingGroup.id
    );

    if (conflictingStudents.length > 0) {
      const conflictDetails = conflictingStudents.map(student => 
        `${student.user.name} is already in group ${student.groupMember.group.groupId}`
      ).join(', ');
      return res.status(400).json({ 
        message: `Cannot add students: ${conflictDetails}` 
      });
    }

    // Update group and members in transaction
    const updatedGroup = await prisma.$transaction(async (tx) => {
      // Update group information
      const group = await tx.group.update({
        where: { id: existingGroup.id },
        data: {
          title,
          description,
          projectType,
          frontendTech: frontendTech || null,
          backendTech: backendTech || null,
          status,
          teamLeaderId: leaders[0].studentId
        }
      });

      // Remove all existing members
      await tx.groupMember.deleteMany({
        where: { groupId: existingGroup.id }
      });

      // Add new members
      await tx.groupMember.createMany({
        data: members.map(member => ({
          studentId: member.studentId,
          groupId: existingGroup.id,
          isLeader: member.isLeader
        }))
      });

      // Return updated group with members
      return await tx.group.findUnique({
        where: { id: existingGroup.id },
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
        }
      });
    });

    // Send notifications to new members
    const currentMemberEmails = existingGroup.members.map(m => m.student.user.email);
    const newMemberEmails = existingStudents
      .filter(student => !currentMemberEmails.includes(student.user.email))
      .map(student => student.user.email);

    if (newMemberEmails.length > 0) {
      await prisma.notification.createMany({
        data: newMemberEmails.map(email => ({
          title: 'Added to Group',
          message: `You have been added to group "${title}" by Prof. ${req.user.name}.`,
          type: 'GROUP_UPDATED',
          recipientEmail: email
        }))
      });
    }

    // Send notifications to removed members
    const newMemberEmails_set = new Set(existingStudents.map(s => s.user.email));
    const removedMemberEmails = currentMemberEmails.filter(email => !newMemberEmails_set.has(email));

    if (removedMemberEmails.length > 0) {
      await prisma.notification.createMany({
        data: removedMemberEmails.map(email => ({
          title: 'Removed from Group',
          message: `You have been removed from group "${existingGroup.title}" by Prof. ${req.user.name}. You are now available to join other groups.`,
          type: 'GROUP_UPDATED',
          recipientEmail: email
        }))
      });
    }

    // Send status change notification to all current members if status changed
    if (existingGroup.status !== status) {
      const allCurrentEmails = existingStudents.map(student => student.user.email);
      let statusMessage = '';
      
      switch (status) {
        case 'ACTIVE':
          statusMessage = `Your group "${title}" has been approved and is now active!`;
          break;
        case 'PENDING':
          statusMessage = `Your group "${title}" status has been changed to pending review.`;
          break;
        case 'REJECTED':
          statusMessage = `Your group "${title}" has been rejected. Please contact your faculty for details.`;
          break;
      }

      if (statusMessage && allCurrentEmails.length > 0) {
        await prisma.notification.createMany({
          data: allCurrentEmails.map(email => ({
            title: 'Group Status Updated',
            message: statusMessage,
            type: 'GROUP_STATUS_CHANGED',
            recipientEmail: email
          }))
        });
      }
    }

    res.json({
      message: 'Group updated successfully',
      group: updatedGroup
    });

  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error while updating group' });
  }
});

// Get all groups with advanced filtering (Admin/Faculty)
router.get('/admin/all', authenticateToken, authorizeRoles('ADMIN', 'FACULTY'), async (req, res) => {
  try {
    const { 
      status, 
      projectType, 
      facultyId, 
      department,
      semester,
      teamSize,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = ''
    } = req.query;

    const skip = (page - 1) * limit;
    const whereClause = {};

    if (status && status !== 'ALL') whereClause.status = status;
    if (projectType && projectType !== 'ALL') whereClause.projectType = projectType;
    if (facultyId) whereClause.facultyId = parseInt(facultyId);
    if (department && department !== 'ALL') {
      whereClause.faculty = {
        department: department
      };
    }

    // Add search functionality
    if (search && search.trim()) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { groupId: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          teamLeader: {
            user: {
              name: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ];
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // First, get all groups with member count
    let groups = await prisma.group.findMany({
      where: whereClause,
      include: {
        members: {
          include: {
            student: {
              include: { user: true }
            }
          }
        },
        teamLeader: {
          include: { user: true }
        },
        faculty: {
          include: { user: true }
        }
      },
      orderBy
    });

    // Apply semester and team size filtering after fetching
    if (semester && semester !== 'ALL') {
      groups = groups.filter(group => 
        group.members?.some(member => 
          member.student?.semester?.toString() === semester
        )
      );
    }

    if (teamSize && teamSize !== 'ALL') {
      const targetSize = parseInt(teamSize);
      groups = groups.filter(group => 
        group.members?.length === targetSize
      );
    }

    // Apply pagination after filtering
    const totalGroups = groups.length;
    const startIndex = skip;
    const endIndex = startIndex + parseInt(limit);
    const paginatedGroups = groups.slice(startIndex, endIndex);

    res.json({
      groups: paginatedGroups,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalGroups / limit),
        totalGroups,
        hasNext: endIndex < totalGroups,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get all groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Force delete group (Admin only)
router.delete('/admin/:groupId/force-delete', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { groupId } = req.params;

    // First check if group exists
    const group = await prisma.group.findUnique({
      where: { groupId }
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Delete all related records first
    await prisma.groupMember.deleteMany({
      where: { groupId: group.id }
    });

    await prisma.notification.deleteMany({
      where: { 
        OR: [
          { title: { contains: groupId } },
          { message: { contains: groupId } }
        ]
      }
    });

    const deletedGroup = await prisma.group.delete({
      where: { groupId }
    });

    res.json({ 
      message: 'Group force deleted successfully',
      group: deletedGroup
    });
  } catch (error) {
    console.error('Force delete group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Transfer group to different faculty (Admin only)
router.patch('/admin/:groupId/transfer-faculty', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { newFacultyId, reason } = req.body;

    const group = await prisma.group.findUnique({
      where: { groupId },
      include: {
        faculty: { include: { user: true } },
        members: { include: { student: { include: { user: true } } } }
      }
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const newFaculty = await prisma.faculty.findUnique({
      where: { id: parseInt(newFacultyId) },
      include: { user: true }
    });

    if (!newFaculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    const updatedGroup = await prisma.group.update({
      where: { groupId },
      data: { facultyId: parseInt(newFacultyId) },
      include: {
        faculty: { include: { user: true } },
        members: { include: { student: { include: { user: true } } } }
      }
    });

    // Send notifications to all group members
    const notifications = group.members.map(member => ({
      userId: member.student.user.id,
      title: 'Faculty Changed',
      message: `Your group "${group.title}" has been transferred from Prof. ${group.faculty.user.name} to Prof. ${newFaculty.user.name}.\n\nReason: ${reason || 'Administrative decision'}`,
      type: 'GROUP_UPDATE'
    }));

    await prisma.notification.createMany({
      data: notifications
    });

    res.json({
      message: 'Group transferred successfully',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Transfer group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available students for faculty editing (Faculty/Admin only)
router.get('/available-students-faculty', authenticateToken, authorizeRoles('FACULTY', 'ADMIN'), async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { groupMember: null }, // Students not in any group
          { 
            groupMember: {
              group: {
                status: { in: ['REJECTED', 'PENDING'] } // Students in rejected or pending groups
              }
            }
          }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        groupMember: {
          include: {
            group: {
              select: { id: true, title: true, status: true }
            }
          }
        }
      },
      orderBy: { user: { name: 'asc' } }
    });

    res.json({ students });
  } catch (error) {
    console.error('Get available students for faculty error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update group by faculty (Faculty/Admin only)
router.put('/:groupId/update-faculty', authenticateToken, authorizeRoles('FACULTY', 'ADMIN'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, description, projectType, frontendTech, backendTech, status, members } = req.body;

    const group = await prisma.group.findUnique({
      where: { groupId },
      include: {
        members: { include: { student: { include: { user: true } } } }
      }
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Update group basic information
    const updatedGroup = await prisma.group.update({
      where: { groupId },
      data: {
        title,
        description,
        projectType,
        frontendTech,
        backendTech,
        status
      }
    });

    // Handle member updates
    if (members && Array.isArray(members)) {
      // Remove all existing members
      await prisma.groupMember.deleteMany({
        where: { groupId: group.id }
      });

      // Add new members
      const newMembers = members.map(member => ({
        studentId: member.studentId,
        groupId: group.id,
        isLeader: member.isLeader
      }));

      await prisma.groupMember.createMany({
        data: newMembers
      });

      // Update teamLeaderId
      const leader = members.find(m => m.isLeader);
      if (leader) {
        await prisma.group.update({
          where: { groupId },
          data: { teamLeaderId: leader.studentId }
        });
      }
    }

    // Fetch updated group with all relations
    const finalGroup = await prisma.group.findUnique({
      where: { groupId },
      include: {
        members: {
          include: {
            student: {
              include: { user: true }
            }
          }
        },
        teamLeader: {
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

    res.json({
      message: 'Group updated successfully',
      group: finalGroup
    });
  } catch (error) {
    console.error('Update group by faculty error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group member emails for announcements (Faculty/Admin only)
router.post('/emails', authenticateToken, authorizeRoles('FACULTY', 'ADMIN'), async (req, res) => {
  try {
    const { groupIds } = req.body;

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ message: 'Group IDs array is required' });
    }

    const groups = await prisma.group.findMany({
      where: { id: { in: groupIds } },
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

    const emails = [];
    groups.forEach(group => {
      group.members.forEach(member => {
        if (!emails.includes(member.student.user.email)) {
          emails.push(member.student.user.email);
        }
      });
    });

    res.json({ emails });
  } catch (error) {
    console.error('Get group emails error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Additional endpoint to handle adding member with validation
router.post('/:groupId/add-member', authenticateToken, authorizeRoles('STUDENT'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { studentId } = req.body; // Assuming studentId is sent in the request body

    // Validate request
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    // Find the group
    const group = await prisma.group.findUnique({
      where: { groupId },
      include: {
        members: true
      }
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if the student is already a member
    const existingMember = group.members.find(member => member.studentId === studentId);

    if (existingMember) {
      return res.status(400).json({ message: 'Student is already a member of this group' });
    }

    // Validate team size (max 4 including leader)
    if (group.members.length >= 4) {
      return res.status(400).json({ message: 'Maximum 4 members allowed in a group' });
    }

    // Add the member to the group
    await prisma.groupMember.create({
      data: {
        studentId,
        groupId: group.id,
        isLeader: false // New members are not leaders by default
      }
    });

    res.json({ message: 'Member added successfully' });

  } catch (error) {
    console.error('Add member to group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get students without groups and send reminder emails (Admin only)
router.post('/admin/send-group-reminder', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { 
      semesters = [], 
      deadline = '', 
      customMessage = '',
      departments = []
    } = req.body;

    // Build filter criteria
    let whereClause = {
      groupMember: null // Students not in any group
    };

    // Add semester filter if specified
    if (semesters.length > 0) {
      whereClause.semester = { in: semesters.map(s => parseInt(s)) };
    }

    // Add department filter if specified
    if (departments.length > 0) {
      whereClause.class = {
        contains: departments.join('|') // This will need adjustment based on your class format
      };
    }

    // Get students without groups
    const studentsWithoutGroups = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { semester: 'asc' },
        { class: 'asc' },
        { user: { name: 'asc' } }
      ]
    });

    if (studentsWithoutGroups.length === 0) {
      return res.json({ 
        message: 'No students found matching the criteria',
        count: 0,
        students: []
      });
    }

    // Prepare email content
    const deadlineText = deadline ? `\n\n⏰ **Important Deadline:** ${deadline}` : '';
    const customText = customMessage ? `\n\n📝 **Additional Information:**\n${customMessage}` : '';

    // Create email content for students
    const studentEmailContent = `
      <p class="content">Dear Student,</p>
      <p class="content">📢 <strong>Important Reminder!</strong> We noticed that you haven't joined or created a project group yet.</p>
      
      <div class="info-box">
        <div class="info-item">
          <div class="info-label">What You Need to Do</div>
          <div class="info-value">Join an existing group OR create a new group with your classmates</div>
        </div>
        <div class="info-item">
          <div class="info-label">Maximum Group Size</div>
          <div class="info-value">4 students per group</div>
        </div>
        <div class="info-item">
          <div class="info-label">Project Types Available</div>
          <div class="info-value">UDP (User Defined Project) or IDP (Industry Defined Project)</div>
        </div>
        ${deadline ? `
          <div class="info-item">
            <div class="info-label">⏰ Deadline</div>
            <div class="info-value" style="color: #EF4444; font-weight: 900;">${deadline}</div>
          </div>
        ` : ''}
      </div>
      
      ${customMessage ? `
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #F59E0B;">
          <div class="info-label">📝 Additional Information</div>
          <div style="color: #1F2937; font-weight: 600; margin-top: 5px; white-space: pre-line;">${customMessage}</div>
        </div>
      ` : ''}
      
      <span class="warning-badge">⚠️ Action Required - Create or Join Group</span>
      
      <p class="content">Don't miss out on this collaborative learning experience! Log in to CAPS now to create your group or join an existing one. 🚀</p>
      
      <a href="#" class="cta-button">Access CAPS Now</a>
      
      <p class="content" style="margin-top: 30px; color: #7C3AED; font-weight: bold;">
        Need help? Contact your faculty or the CAPS support team! 💪
      </p>
    `;

    // Send emails to all students
    const emailPromises = studentsWithoutGroups.map(async (student) => {
      const emailHTML = global.createCAPSEmailTemplate(
        'Group Formation Reminder! 📋', 
        studentEmailContent,
        '#F59E0B'
      );

      return global.sendEmail(
        student.user.email, 
        `Group Formation Reminder${deadline ? ` - Deadline: ${deadline}` : ''}`, 
        emailHTML
      );
    });

    // Send all emails
    await Promise.all(emailPromises);

    // Create notifications in the system
    await prisma.notification.createMany({
      data: studentsWithoutGroups.map(student => ({
        title: 'Group Formation Reminder',
        message: `You haven't joined or created a project group yet. Please create a group or join an existing one.${deadlineText}${customText}`,
        type: 'GROUP_REMINDER',
        recipientEmail: student.user.email
      }))
    });

    res.json({
      message: `Reminder emails sent successfully to ${studentsWithoutGroups.length} students`,
      count: studentsWithoutGroups.length,
      students: studentsWithoutGroups.map(s => ({
        id: s.id,
        name: s.user.name,
        email: s.user.email,
        semester: s.semester,
        class: s.class,
        division: s.division
      }))
    });

  } catch (error) {
    console.error('Send group reminder error:', error);
    res.status(500).json({ message: 'Server error while sending reminder emails' });
  }
});

// Get students without groups for preview (Admin only)
router.get('/admin/students-without-groups', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { semesters, departments } = req.query;

    let whereClause = {
      groupMember: null // Students not in any group
    };

    // Add filters if specified
    if (semesters) {
      const semesterArray = semesters.split(',').map(s => parseInt(s.trim()));
      whereClause.semester = { in: semesterArray };
    }

    if (departments) {
      const deptArray = departments.split(',');
      whereClause.OR = deptArray.map(dept => ({
        class: { contains: dept.trim() }
      }));
    }

    const studentsWithoutGroups = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { semester: 'asc' },
        { class: 'asc' },
        { user: { name: 'asc' } }
      ]
    });

    // Group by semester for better organization
    const groupedBySemester = studentsWithoutGroups.reduce((acc, student) => {
      const sem = student.semester;
      if (!acc[sem]) acc[sem] = [];
      acc[sem].push({
        id: student.id,
        name: student.user.name,
        email: student.user.email,
        enrollmentNo: student.enrollmentNo,
        class: student.class,
        division: student.division
      });
      return acc;
    }, {});

    res.json({
      totalCount: studentsWithoutGroups.length,
      byDepartment: groupedBySemester,
      students: studentsWithoutGroups.map(s => ({
        id: s.id,
        name: s.user.name,
        email: s.user.email,
        semester: s.semester,
        enrollmentNo: s.enrollmentNo,
        class: s.class,
        division: s.division
      }))
    });

  } catch (error) {
    console.error('Get students without groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export groups to CSV (Admin/Faculty only)
router.get('/export/csv', authenticateToken, authorizeRoles('ADMIN', 'FACULTY'), async (req, res) => {
  try {
    const { status, projectType, department } = req.query;
    
    let whereClause = {};
    
    // Apply faculty restriction
    if (req.user.role === 'FACULTY') {
      whereClause.facultyId = req.user.faculty.id;
    }
    
    // Apply filters
    if (status && status !== 'ALL') whereClause.status = status;
    if (projectType && projectType !== 'ALL') whereClause.projectType = projectType;

    const groups = await prisma.group.findMany({
      where: whereClause,
      include: {
        members: {
          include: {
            student: {
              include: { user: true }
            }
          }
        },
        teamLeader: {
          include: { user: true }
        },
        faculty: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Generate CSV content
    const csvHeader = 'group_id,title,status,project_type,team_leader,faculty,member_count,members,created_date\n';
    
    const csvRows = groups.map(group => {
      const groupId = group.groupId || '';
      const title = group.title || '';
      const status = group.status || '';
      const projectType = group.projectType || '';
      const teamLeader = group.teamLeader?.user?.name || 'Unknown';
      const faculty = group.faculty?.user?.name || 'Not assigned';
      const memberCount = group.members?.length || 0;
      const members = group.members?.map(m => m.student?.user?.name || 'Unknown').join('; ') || '';
      const createdDate = new Date(group.createdAt).toLocaleDateString();

      const escapeCSVField = (field) => {
        if (typeof field !== 'string') field = String(field);
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      return [
        escapeCSVField(groupId),
        escapeCSVField(title),
        escapeCSVField(status),
        escapeCSVField(projectType),
        escapeCSVField(teamLeader),
        escapeCSVField(faculty),
        escapeCSVField(memberCount),
        escapeCSVField(members),
        escapeCSVField(createdDate)
      ].join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `CAPS_Groups_Export_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');

    res.send(csvContent);

  } catch (error) {
    console.error('Groups CSV export error:', error);
    res.status(500).json({ message: 'Error generating groups CSV export' });
  }
});

module.exports = router;
