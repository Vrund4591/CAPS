const express = require('express');
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

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

module.exports = router;
