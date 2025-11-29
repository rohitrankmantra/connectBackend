const express = require("express");
const { APIContracts, APIControllers } = require("authorizenet");
const router = express.Router();
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

// 🔐 Environment Variables
const API_LOGIN_ID = process.env.API_LOGIN_ID;
const TRANSACTION_KEY = process.env.TRANSACTION_KEY;
const AUTHORIZE_MODE = process.env.AUTHORIZE_MODE || "SANDBOX";

const FRONTEND_URL = process.env.FRONTEND_URL || "https://connectwithus.vercel.app";

// -------------------------------
// ⭐ Utility: Authorize.Net ENV
// -------------------------------
const AUTHORIZE_API_URL =
  AUTHORIZE_MODE === "PRODUCTION"
    ? "https://api2.authorize.net/xml/v1/request.api"
    : "https://apitest.authorize.net/xml/v1/request.api";

const PAYMENT_URL =
  AUTHORIZE_MODE === "PRODUCTION"
    ? "https://accept.authorize.net/payment/payment"
    : "https://test.authorize.net/payment/payment";

// =====================================================================
// 🔵 ROUTE 1: Get Hosted Payment Token
// =====================================================================
router.post("/get-donation-token", async (req, res) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid amount",
    });
  }

  try {
    // Merchant Authentication
    const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
    merchantAuthentication.setName(API_LOGIN_ID);
    merchantAuthentication.setTransactionKey(TRANSACTION_KEY);

    // Transaction
    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType("authCaptureTransaction");
    transactionRequest.setAmount(parseFloat(amount));

    // Payment Page Settings
    const settingsArray = [];

    const returnSetting = new APIContracts.SettingType();
    returnSetting.setSettingName("hostedPaymentReturnOptions");
    returnSetting.setSettingValue(
      JSON.stringify({
        showReceipt: false,
        url: `${FRONTEND_URL}/donation-success`,
        cancelUrl: `${FRONTEND_URL}/donation-cancel`,
      })
    );

    settingsArray.push(returnSetting);

    const settings = new APIContracts.ArrayOfSetting();
    settings.setSetting(settingsArray);

    // Request
    const request = new APIContracts.GetHostedPaymentPageRequest();
    request.setMerchantAuthentication(merchantAuthentication);
    request.setTransactionRequest(transactionRequest);
    request.setHostedPaymentSettings(settings);

    const controller = new APIControllers.GetHostedPaymentPageController(
      request.getJSON()
    );

    controller.setEnvironment(AUTHORIZE_API_URL);

    // Execute request
    controller.execute(() => {
      const apiResponse = controller.getResponse();
      const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

      if (!response || !response.getMessages()) {
        return res.status(500).json({
          success: false,
          message: "Invalid response from Authorize.Net",
        });
      }

      if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
        const token = response.getToken();
        return res.json({
          success: true,
          token,
          paymentUrl: PAYMENT_URL,
        });
      }

      const errMsg = response.getMessages().getMessage()[0].getText();
      console.error("Authorize.Net Error:", errMsg);

      return res.status(500).json({
        success: false,
        message: errMsg,
      });
    });
  } catch (error) {
    console.error("Server Error in /get-donation-token:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// =====================================================================
// 🔵 ROUTE 2: Send Thank You Email
// =====================================================================
router.post("/send-thankyou", async (req, res) => {
  const { name, email, phone, amount } = req.body;
  console.log("📩 Email API Hit!");
console.log(req.body);

  if (!name || !email || !amount) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

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

    const htmlContent = `
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
    `;

    await transporter.sendMail({
      from: `"National Fellowship Conference" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your Donation Receipt",
      html: htmlContent,
    });

    return res.json({ success: true });
    

  } catch (error) {
    console.error("Email Error:", error);
    return res.status(500).json({
      success: false,
      message: "Email sending failed.",
    });
  }
});

module.exports = router;
