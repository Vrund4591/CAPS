const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const notificationRoutes = require('./routes/notifications');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Email transporter configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // or your preferred email service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Use app password for Gmail
    }
  });
};

// Make email transporter available globally
global.emailTransporter = createEmailTransporter();

// CAPS Platform Email Template
global.createCAPSEmailTemplate = (title, content, accentColor = '#4F46E5') => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            body { 
                margin: 0; 
                padding: 0; 
                background-color: #FFFFF4; 
                font-family: 'Inter', Arial, sans-serif; 
                line-height: 1.6;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #FFFFF4; 
                padding: 20px; 
            }
            .header {
                background-color: ${accentColor};
                padding: 30px 20px;
                border-radius: 20px 20px 0 0;
                border: 4px solid #000;
                border-bottom: none;
                text-align: center;
                position: relative;
            }
            .header::before {
                content: '';
                position: absolute;
                top: 15px;
                right: 15px;
                width: 20px;
                height: 20px;
                background-color: #FFD700;
                border-radius: 50%;
                border: 3px solid #000;
            }
            .header::after {
                content: '';
                position: absolute;
                bottom: 15px;
                left: 15px;
                width: 15px;
                height: 15px;
                background-color: #FF6B6B;
                border-radius: 3px;
                border: 3px solid #000;
            }
            .logo {
                color: white;
                font-size: 36px;
                font-weight: 900;
                margin: 0;
                text-shadow: 3px 3px 0px #000;
            }
            .tagline {
                color: #FFFFF4;
                font-size: 12px;
                font-weight: 800;
                margin: 5px 0 0 0;
                letter-spacing: 2px;
                text-transform: uppercase;
            }
            .main-content {
                background-color: white;
                padding: 30px;
                border: 4px solid #000;
                border-top: none;
                border-bottom: none;
                position: relative;
            }
            .title {
                color: ${accentColor};
                font-size: 24px;
                font-weight: 900;
                margin: 0 0 20px 0;
                text-align: center;
            }
            .content {
                color: #1F2937;
                font-size: 16px;
                font-weight: 500;
                margin-bottom: 20px;
            }
            .info-box {
                background-color: #FFFFF4;
                border: 3px solid #000;
                border-radius: 15px;
                padding: 20px;
                margin: 20px 0;
                position: relative;
            }
            .info-item {
                margin: 8px 0;
                font-weight: 600;
            }
            .info-label {
                color: #6B7280;
                font-weight: 800;
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 1px;
            }
            .info-value {
                color: #1F2937;
                font-weight: 700;
                font-size: 16px;
            }
            .cta-button {
                display: inline-block;
                background-color: ${accentColor};
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 15px;
                border: 4px solid #000;
                font-weight: 900;
                font-size: 16px;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin: 20px auto;
                display: block;
                text-align: center;
                width: fit-content;
                box-shadow: 6px 6px 0px #000;
            }
            .footer {
                background-color: #1F2937;
                color: white;
                padding: 25px;
                text-align: center;
                border: 4px solid #000;
                border-radius: 0 0 20px 20px;
                border-top: none;
                position: relative;
            }
            .footer::before {
                content: '';
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 4px;
                background-color: ${accentColor};
                border-radius: 2px;
            }
            .footer-text {
                font-size: 12px;
                font-weight: 600;
                margin: 0;
                opacity: 0.8;
            }
            .success-badge {
                background-color: #10B981;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                border: 3px solid #000;
                font-weight: 900;
                font-size: 14px;
                display: inline-block;
                margin: 10px 0;
            }
            .warning-badge {
                background-color: #F59E0B;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                border: 3px solid #000;
                font-weight: 900;
                font-size: 14px;
                display: inline-block;
                margin: 10px 0;
            }
            .error-badge {
                background-color: #EF4444;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                border: 3px solid #000;
                font-weight: 900;
                font-size: 14px;
                display: inline-block;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="logo">CAPS</h1>
                <p class="tagline">COLLABORATIVE ASSIGNMENT & PROJECT SYSTEM</p>
            </div>
            <div class="main-content">
                <h2 class="title">${title}</h2>
                ${content}
            </div>
            <div class="footer">
                <p class="footer-text">
                    This is an automated notification from the CAPS system.<br>
                    © CAPS - Making collaboration awesome! 🚀
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Email sending utility
global.sendEmail = async (to, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: `"CAPS System 🎓" <${process.env.EMAIL_USER}>`,
      to,
      subject: `🎯 ${subject}`,
      html: htmlContent
    };
    
    await global.emailTransporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Email sending error:', error);
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'CAPS Backend is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
