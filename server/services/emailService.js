const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'fake_user',
        pass: process.env.SMTP_PASS || 'fake_pass'
    }
});

const sendAlertEmail = async (toEmail, symbol, condition, targetPrice, currentPrice) => {
    try {
        const subject = `AI Stock Tracker Alert: ${symbol} is ${condition} ${targetPrice}`;
        const text = `Hello,\n\nYour price alert for ${symbol} has been triggered.\nThe current price is $${currentPrice}, which is ${condition} your target price of $${targetPrice}.\n\nLog in to your dashboard to view more details.\n\nBest,\nAI Stock Tracker Team`;

        // Use a test account fallback natively if no credentials
        if (process.env.SMTP_HOST) {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'alerts@aistocktracker.com',
                to: toEmail,
                subject,
                text
            });
        } else {
            // Generate test ethereal account if nothing provided
            const testAccount = await nodemailer.createTestAccount();
            const testTransporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: testAccount.user, // generated ethereal user
                    pass: testAccount.pass, // generated ethereal password
                },
            });
            const info = await testTransporter.sendMail({
                from: '"AI Stock Tracker" <alerts@example.com>',
                to: toEmail,
                subject,
                text
            });
            console.log("Alert email sent to: %s", info.messageId);
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }

    } catch (error) {
        console.error("Failed to send alert email:", error);
    }
};

module.exports = { sendAlertEmail };
