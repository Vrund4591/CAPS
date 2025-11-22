const express = require('express');
const { prisma } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all groups for grading (Faculty/Admin only)
router.get('/groups', authenticateToken, authorizeRoles('FACULTY', 'ADMIN'), async (req, res) => {
  try {
    const { presentationSlot = 'ALL' } = req.query;
    
    let whereClause = {
      status: 'ACTIVE' // Only active groups can be graded
    };

    // Faculty can only see their assigned groups
    if (req.user.role === 'FACULTY') {
      whereClause.facultyId = req.user.faculty.id;
    }

    const groups = await prisma.group.findMany({
      where: whereClause,
      include: {
        members: {
          include: {
            student: {
              include: { user: true }
            },
            grades: {
              where: presentationSlot !== 'ALL' ? { presentationSlot } : {}
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

    res.json({ groups });
  } catch (error) {
    console.error('Get groups for grading error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit grades for a group presentation (Faculty/Admin only)
router.post('/groups/:groupId/grade', authenticateToken, authorizeRoles('FACULTY', 'ADMIN'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { presentationSlot, grades, feedback } = req.body;

    // Validate presentation slot
    if (!['PRESENTATION_1', 'PRESENTATION_2', 'FINAL'].includes(presentationSlot)) {
      return res.status(400).json({ message: 'Invalid presentation slot' });
    }

    // Validate grades array
    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ message: 'Grades array is required' });
    }

    // Find the group
    const group = await prisma.group.findFirst({
      where: { 
        groupId,
        status: 'ACTIVE'
      },
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
    });

    if (!group) {
      return res.status(404).json({ message: 'Active group not found' });
    }

    // Faculty can only grade their assigned groups
    if (req.user.role === 'FACULTY' && group.facultyId !== req.user.faculty.id) {
      return res.status(403).json({ message: 'Not authorized to grade this group' });
    }

    // Validate all group members have grades
    const memberIds = group.members.map(m => m.studentId);
    const gradedMemberIds = grades.map(g => g.studentId);
    
    if (!memberIds.every(id => gradedMemberIds.includes(id))) {
      return res.status(400).json({ message: 'All group members must have grades' });
    }

    // Validate marks (0-10)
    const invalidGrades = grades.filter(g => 
      typeof g.marks !== 'number' || g.marks < 0 || g.marks > 10
    );
    
    if (invalidGrades.length > 0) {
      return res.status(400).json({ message: 'All marks must be between 0 and 10' });
    }

    // Save grades in transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing grades for this presentation slot if any
      await tx.grade.deleteMany({
        where: {
          groupMemberId: { in: group.members.map(m => m.id) },
          presentationSlot
        }
      });

      // Create new grades
      const gradeData = grades.map(grade => {
        const member = group.members.find(m => m.studentId === grade.studentId);
        return {
          groupMemberId: member.id,
          marks: grade.marks,
          presentationSlot,
          feedback: grade.feedback || null,
          gradedBy: req.user.id,
          gradedAt: new Date()
        };
      });

      await tx.grade.createMany({
        data: gradeData
      });

      // Create general feedback for the group if provided
      if (feedback && feedback.trim()) {
        await tx.presentationFeedback.upsert({
          where: {
            groupId_presentationSlot: {
              groupId: group.id,
              presentationSlot
            }
          },
          update: {
            feedback: feedback.trim(),
            updatedAt: new Date()
          },
          create: {
            groupId: group.id,
            presentationSlot,
            feedback: feedback.trim(),
            gradedBy: req.user.id
          }
        });
      }
    });

    // Send notification to faculty about successful grading
    const slotName = presentationSlot.replace('_', ' ').toLowerCase();
    await prisma.notification.create({
      data: {
        title: 'Grading Completed',
        message: `You have successfully graded ${group.title} for ${slotName}.`,
        type: 'GRADING_COMPLETED',
        recipientEmail: req.user.email
      }
    });

    res.json({
      message: `Grades submitted successfully for ${slotName}`,
      presentationSlot,
      groupId: group.groupId
    });

  } catch (error) {
    console.error('Submit grades error:', error);
    res.status(500).json({ message: 'Server error while submitting grades' });
  }
});

// Get grades for a specific group and presentation (Faculty/Admin only)
router.get('/groups/:groupId/grades', authenticateToken, authorizeRoles('FACULTY', 'ADMIN'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { presentationSlot } = req.query;

    const group = await prisma.group.findFirst({
      where: { groupId },
      include: {
        members: {
          include: {
            student: {
              include: { user: true }
            },
            grades: {
              where: presentationSlot ? { presentationSlot } : {},
              include: {
                gradedByUser: {
                  select: { name: true, email: true }
                }
              }
            }
          }
        },
        presentationFeedbacks: {
          where: presentationSlot ? { presentationSlot } : {},
          include: {
            gradedByUser: {
              select: { name: true, email: true }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Faculty can only see grades for their assigned groups
    if (req.user.role === 'FACULTY' && group.facultyId !== req.user.faculty.id) {
      return res.status(403).json({ message: 'Not authorized to view grades for this group' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get grading statistics (Admin only)
router.get('/statistics', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const stats = await prisma.$transaction(async (tx) => {
      // Total active groups
      const totalGroups = await tx.group.count({
        where: { status: 'ACTIVE' }
      });

      // Grading completion by presentation slot
      const presentation1Graded = await tx.grade.findMany({
        where: { presentationSlot: 'PRESENTATION_1' },
        distinct: ['groupMemberId'],
        select: { groupMember: { include: { group: true } } }
      });

      const presentation2Graded = await tx.grade.findMany({
        where: { presentationSlot: 'PRESENTATION_2' },
        distinct: ['groupMemberId'],
        select: { groupMember: { include: { group: true } } }
      });

      const finalGraded = await tx.grade.findMany({
        where: { presentationSlot: 'FINAL' },
        distinct: ['groupMemberId'],
        select: { groupMember: { include: { group: true } } }
      });

      // Get unique group counts
      const p1Groups = new Set(presentation1Graded.map(g => g.groupMember.group.id)).size;
      const p2Groups = new Set(presentation2Graded.map(g => g.groupMember.group.id)).size;
      const finalGroups = new Set(finalGraded.map(g => g.groupMember.group.id)).size;

      // Average marks by presentation
      const avgMarks = await tx.grade.groupBy({
        by: ['presentationSlot'],
        _avg: { marks: true },
        _count: { marks: true }
      });

      return {
        totalGroups,
        gradingProgress: {
          presentation1: { graded: p1Groups, pending: totalGroups - p1Groups },
          presentation2: { graded: p2Groups, pending: totalGroups - p2Groups },
          final: { graded: finalGroups, pending: totalGroups - finalGroups }
        },
        averageMarks: avgMarks.reduce((acc, item) => {
          acc[item.presentationSlot] = {
            average: Math.round(item._avg.marks * 100) / 100,
            count: item._count.marks
          };
          return acc;
        }, {})
      };
    });

    res.json(stats);
  } catch (error) {
    console.error('Get grading statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export grades to CSV (Admin only)
router.get('/export/csv', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { presentationSlot, facultyId } = req.query;

    let whereClause = {
      group: { status: 'ACTIVE' }
    };

    if (presentationSlot && presentationSlot !== 'ALL') {
      whereClause.presentationSlot = presentationSlot;
    }

    if (facultyId) {
      whereClause.group.facultyId = parseInt(facultyId);
    }

    const grades = await prisma.grade.findMany({
      where: whereClause,
      include: {
        groupMember: {
          include: {
            student: {
              include: { user: true }
            },
            group: {
              include: {
                faculty: {
                  include: { user: true }
                }
              }
            }
          }
        },
        gradedByUser: {
          select: { name: true }
        }
      },
      orderBy: [
        { groupMember: { group: { groupId: 'asc' } } },
        { presentationSlot: 'asc' },
        { groupMember: { student: { user: { name: 'asc' } } } }
      ]
    });

    // Generate CSV content
    const csvHeader = 'group_id,group_title,student_name,enrollment_no,presentation_slot,marks,feedback,faculty,graded_by,graded_date\n';
    
    const csvRows = grades.map(grade => {
      const group = grade.groupMember.group;
      const student = grade.groupMember.student;
      
      const escapeCSVField = (field) => {
        if (typeof field !== 'string') field = String(field);
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      return [
        escapeCSVField(group.groupId),
        escapeCSVField(group.title),
        escapeCSVField(student.user.name),
        escapeCSVField(student.enrollmentNo || ''),
        escapeCSVField(grade.presentationSlot.replace('_', ' ')),
        escapeCSVField(grade.marks),
        escapeCSVField(grade.feedback || ''),
        escapeCSVField(group.faculty?.user?.name || ''),
        escapeCSVField(grade.gradedByUser.name),
        escapeCSVField(new Date(grade.gradedAt).toLocaleDateString())
      ].join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `CAPS_Grades_Export_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');

    res.send(csvContent);

  } catch (error) {
    console.error('Grades CSV export error:', error);
    res.status(500).json({ message: 'Error generating grades CSV export' });
  }
});

module.exports = router;
