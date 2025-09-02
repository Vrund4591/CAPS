const express = require('express');
const { prisma } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientEmail: req.user.email },
      orderBy: { sentAt: 'desc' }
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { isRead: true }
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark multiple notifications as read
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: 'Notification IDs array is required' });
    }

    await prisma.notification.updateMany({
      where: { 
        id: { in: notificationIds },
        recipientEmail: req.user.email 
      },
      data: { isRead: true }
    });

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Mark multiple notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new notification (internal use - can be called by other routes)
const createNotification = async (recipientEmail, title, message, type = 'INFO', sendEmail = true) => {
  try {
    // Create database notification
    const notification = await prisma.notification.create({
      data: {
        recipientEmail,
        title,
        message,
        type
      }
    });

    // Send email if requested
    if (sendEmail && global.sendEmail) {
      const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">${title}</h2>
          <div style="background-color: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="white-space: pre-line;">${message}</p>
          </div>
          <p><small>This is an automated notification from the CAPS system.</small></p>
          <p>Best regards,<br>CAPS Team</p>
        </div>
      `;

      await global.sendEmail(recipientEmail, `CAPS Notification: ${title}`, emailHTML);
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

// Send custom notification (Admin/Faculty only)
router.post('/send', authenticateToken, authorizeRoles('ADMIN', 'FACULTY'), async (req, res) => {
  try {
    const { recipientEmails, title, message, sendEmailNotification = true } = req.body;

    if (!recipientEmails || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return res.status(400).json({ message: 'Recipient emails are required' });
    }

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const notifications = [];
    for (const email of recipientEmails) {
      const notification = await createNotification(email, title, message, 'ANNOUNCEMENT', sendEmailNotification);
      notifications.push(notification);
    }

    res.json({
      message: `Notifications sent to ${recipientEmails.length} recipients`,
      notifications
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export the createNotification function for use in other routes
module.exports = router;
module.exports.createNotification = createNotification;
