const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();

router.post("/paypal-thankyou-mail", async (req, res) => {
  const { name, email, phone, amount } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      port: 587,
      secure: false,
    });

    await transporter.sendMail({
      from: `"National Fellowship Conference" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your PayPal Donation Receipt",
      html: `
      <div style="font-family: Arial, sans-serif; color: #333; background: #f9f9f9; padding: 20px;">
        <div style="max-width: 700px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden;">
          
          <div style="background: #2c3e50; color: #fff; padding: 25px; text-align: center;">
            <h1>Thank You for Your Donation</h1>
          </div>

          <div style="padding: 25px; line-height: 1.6; font-size: 15px;">
            <p>Dear ${name},</p>

            <p>
              Thank you for your generous donation of 
              <strong style="color:#27ae60;">$${amount}</strong>.
            </p>

            <p>
              <strong>The National Fellowship Conference of Christian Churches, Inc.</strong><br>
              <strong>Tax Deductible IRS EIN: 22-2513753</strong>
            </p>

            <p>
              Your contribution helps support our mission programs, education, discipleship,
              and global outreach efforts.
            </p>

            <p>
              With gratitude,<br>
              <strong>Dr. Gary Kirkwood, Sr.<br>The Board of Governors</strong>
            </p>

            <hr style="margin: 30px 0; border-top: 1px solid #eee;">

            <p><strong>Ministries Supported:</strong></p>
            <ul>
              <li>Scripture Church</li>
              <li>Tapon Media Marketing Group</li>
              <li>African American Global Business Alliance</li>
              <li>Gary Kirkwood Ministries</li>
              <li>The Family Enrichment Center</li>
              <li>Community & Economic Development Corp</li>
              <li>Dreams & Visions Early Learning Center</li>
              <li>Dreams & Visions Preparatory School</li>
              <li>Unlimited Career Training Institute</li>
            </ul>

            <hr style="margin: 30px 0; border-top: 1px solid #eee;">

            <p style="font-size: 13px; color: #777;">
              <strong>Phone:</strong> ${phone || "N/A"}
            </p>
          </div>
        </div>
      </div>
    `,
    });

    return res.json({ success: true });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send mail",
      error,
    });
  }
});

module.exports = router;
