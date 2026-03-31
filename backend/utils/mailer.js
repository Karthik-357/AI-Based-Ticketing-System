import nodemailer from "nodemailer";

// Create reusable transporter using Gmail SMTP
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false, // true for 465, false for 587
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

export const sendMail = async (to, subject, text, html = null) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.SMTP_FROM,
            to,
            subject,
            text,
        };

        // Add HTML content if provided
        if (html) {
            mailOptions.html = html;
        }

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("Email error:", error.message);
        throw error;
    }
};

export const sendOTPEmail = async (to, otp) => {
    const subject = "Password Reset OTP";
    
    const text = `Your OTP for password reset is: ${otp}

This OTP will expire in 10 minutes.

If you didn't request this, please ignore this email.`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Password Reset OTP</h2>
            <p>Your OTP for password reset is:</p>
            <div style="background-color: #F3F4F6; 
                        padding: 20px; 
                        text-align: center; 
                        border-radius: 8px; 
                        margin: 20px 0;">
                <span style="font-size: 32px; 
                             font-weight: bold; 
                             letter-spacing: 8px; 
                             color: #4F46E5;">
                    ${otp}
                </span>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
    `;

    return sendMail(to, subject, text, html);
};