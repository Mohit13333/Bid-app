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

// Function to send an email
export const sendMail = async function ({ to, subject, text, html }) {
  let info = await transporter.sendMail({
    from: `"BID.ai" <${process.env.EMAIL}>`,
    to,
    subject,
    text,
    html,
  });
  return info;
};

// Function to send a new message notification email
export const sendNewMessageNotification = async ({ to, sender, message, roomId }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color:rgb(24, 55, 189); text-align: center;">New Message from ${sender}</h2>
      <p style="text-align: center;">You have received a new message from <strong>${sender}</strong>.</p>
      
      <div style="font-size: 18px; font-style: italic; color: #555; margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 5px solid rgb(24, 55, 189);">
        "${message}"
      </div>

      <p style="text-align: center;">Click the button below to reply:</p>

      <div style="text-align: center; margin-top: 20px;">
        <a href="http://localhost:5173/chat/${roomId}"
           style="display: inline-block; padding: 12px 20px; font-size: 16px; color: #fff; background-color: rgb(24, 55, 189); text-decoration: none; border-radius: 5px;">
          Open Chat
        </a>
      </div>

      <p style="text-align: center; margin-top: 20px; font-size: 14px; color: #777;">
        If you did not expect this message, you can safely ignore this email.
      </p>

      <p style="text-align: center; margin-top: 20px; font-size: 14px; color: #777;">
        Thanks,<br/>
        <strong>BID.ai Team</strong>
      </p>
    </div>
  `;

  const info = await sendMail({
    to,
    subject: `New Message from ${sender}`,
    text: `You have received a new message from ${sender}: "${message}". Click here to reply: http://localhost:5173/chat`,
    html,
  });

  return info;
};
