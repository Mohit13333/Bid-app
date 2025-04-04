import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
    },
});

export const sendVerificationEmail = async (email, name, token) => {
    const verificationLink = `http://localhost:5173/verify-email?token=${token}`;

    const html = `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color:rgb(24, 55, 189); text-align: center;">Welcome to BID.ai, ${name}!</h2>
      <p style="text-align: center;">Please verify your email to activate your account.</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="${verificationLink}" 
           style="display: inline-block; padding: 12px 20px; font-size: 16px; color: #fff; background-color: rgb(24, 55, 189); text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
      </div>

      <p style="text-align: center; font-size: 14px; color: #777;">
        If the button doesn't work, click the link below:<br>
        <a href="${verificationLink}" style="color: rgb(24, 55, 189);">${verificationLink}</a>
      </p>

      <p style="text-align: center; margin-top: 20px; font-size: 14px; color: #777;">
        If you did not sign up for BID.ai, you can ignore this email.
      </p>

      <p style="text-align: center; margin-top: 20px; font-size: 14px; color: #777;">
        Thanks,<br/>
        <strong>BID.ai Team</strong>
      </p>
    </div>
  `;

    let info = await transporter.sendMail({
        from: `"BID.ai" <${process.env.EMAIL}>`,
        to: email,
        subject: "Verify Your Email - BID.ai",
        text: `Hi ${name},\n\nPlease verify your email by clicking the link below:\n${verificationLink}\n\nIf you did'nt send the verrification link, you can ignore this email.\n\nThanks,\nBID.ai Team`,
        html,
    });

    return info;
};
