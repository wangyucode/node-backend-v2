import nodemailer from "nodemailer";

const FROM_EMAIL = "your-email@example.com"; // 替换为实际的发件人邮箱

export async function sendEmail(
  content,
  subject = "【Node.js】后端推送",
  to = "wangyu@wycode.cn"
) {
  const transporter = nodemailer.createTransport({
    host: "smtp.qq.com",
    port: 465,
    secure: true,
    auth: {
      user: FROM_EMAIL,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: FROM_EMAIL,
    to,
    subject,
    text: content,
  };

  try {
    if (process.env.ENV === "prod") await transporter.sendMail(mailOptions);
    console.info(`Sent email to: ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
