const express = require("express");
const { APIContracts, APIControllers } = require("authorizenet");
const router = express.Router();
const nodemailer = require("nodemailer");

const API_LOGIN_ID = process.env.API_LOGIN_ID;
const TRANSACTION_KEY = process.env.TRANSACTION_KEY;
const AUTHORIZE_MODE = process.env.AUTHORIZE_MODE || "SANDBOX"; 

// router.post("/get-donation-token", async (req, res) => {
//   const { amount } = req.body;

//   // 🟢 Debug Logs
//   console.log("👉 /get-donation-token called with amount:", amount);
//   console.log("👉 API_LOGIN_ID:", API_LOGIN_ID ? "Loaded ✅" : "MISSING ❌");
//   console.log("👉 TRANSACTION_KEY:", TRANSACTION_KEY ? "Loaded ✅" : "MISSING ❌");

//   try {
//     const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
//     merchantAuthentication.setName(API_LOGIN_ID);
//     merchantAuthentication.setTransactionKey(TRANSACTION_KEY);

//     const transactionRequest = new APIContracts.TransactionRequestType();
//     transactionRequest.setTransactionType("authCaptureTransaction");
//     transactionRequest.setAmount(parseFloat(amount));

//     const setting = new APIContracts.SettingType();
//     setting.setSettingName("hostedPaymentReturnOptions");
//     setting.setSettingValue(
//       JSON.stringify({
//         showReceipt: false,
//         url: "https://connectwithus.vercel.app/donation-success",
//         cancelUrl: "https://connectwithus.vercel.app/donation-cancel",
//       })
//     );

//     const request = new APIContracts.GetHostedPaymentPageRequest();
//     request.setMerchantAuthentication(merchantAuthentication);
//     request.setTransactionRequest(transactionRequest);
//     request.setHostedPaymentSettings(new APIContracts.ArrayOfSetting([setting]));

//     const controller = new APIControllers.GetHostedPaymentPageController(
//       request.getJSON()
//     );

//     console.log("👉 Sending request to Authorize.Net...");

//     controller.execute(() => {
//       const apiResponse = controller.getResponse();
//       console.log("👉 Raw Authorize.Net Response:", apiResponse);

//       const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

//       if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
//         console.log("✅ Token generated successfully:", response.getToken());
//         res.json({ success: true, token: response.getToken() });
//       } else {
//         const errMsg = response.getMessages().getMessage()[0].getText();
//         console.error("❌ Authorize.Net Error:", errMsg);
//         res.status(500).json({
//           success: false,
//           message: errMsg,
//         });
//       }
//     });
//   } catch (err) {
//     console.error("🔥 Server Error in /get-donation-token:", err);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// });



router.post("/get-donation-token", async (req, res) => {
  const { amount } = req.body;

  console.log("👉 /get-donation-token called with amount:", amount);
  console.log("👉 API_LOGIN_ID:", API_LOGIN_ID ? "Loaded ✅" : "MISSING ❌");
  console.log("👉 TRANSACTION_KEY:", TRANSACTION_KEY ? "Loaded ✅" : "MISSING ❌");
  console.log("👉 Running in mode:", AUTHORIZE_MODE);

  try {
    // 🟢 Merchant Authentication
    const merchantAuthentication = new APIContracts.MerchantAuthenticationType();
    merchantAuthentication.setName(API_LOGIN_ID);
    merchantAuthentication.setTransactionKey(TRANSACTION_KEY);

    // 🟢 Transaction Request
    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType("authCaptureTransaction");
    transactionRequest.setAmount(parseFloat(amount));

    // 🟢 Payment Page Settings
    const setting = new APIContracts.SettingType();
    setting.setSettingName("hostedPaymentReturnOptions");
    setting.setSettingValue(
      JSON.stringify({
        showReceipt: false,
        url: "https://connectwithus.vercel.app/donation-success",
        cancelUrl: "https://connectwithus.vercel.app/donation-cancel",
      })
    );

    const request = new APIContracts.GetHostedPaymentPageRequest();
    request.setMerchantAuthentication(merchantAuthentication);
    request.setTransactionRequest(transactionRequest);
    request.setHostedPaymentSettings(new APIContracts.ArrayOfSetting([setting]));

    // 🟢 Controller
    const controller = new APIControllers.GetHostedPaymentPageController(
      request.getJSON()
    );

   // ✅ Correct way
if (AUTHORIZE_MODE === "PRODUCTION") {
  controller.setEnvironment(APIControllers.constants.endpoint.production);
} else {
  controller.setEnvironment(APIControllers.constants.endpoint.sandbox);
}

    console.log(`👉 Sending request to Authorize.Net (${AUTHORIZE_MODE})...`);

    controller.execute(() => {
      const apiResponse = controller.getResponse();
      console.log("👉 Raw Authorize.Net Response:", apiResponse);

      const response = new APIContracts.GetHostedPaymentPageResponse(apiResponse);

      if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
        console.log("✅ Token generated successfully:", response.getToken());
        res.json({ success: true, token: response.getToken() });
      } else {
        const errMsg = response.getMessages().getMessage()[0].getText();
        console.error("❌ Authorize.Net Error:", errMsg);
        res.status(500).json({
          success: false,
          message: errMsg,
        });
      }
    });
  } catch (err) {
    console.error("🔥 Server Error in /get-donation-token:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/send-thankyou", async (req, res) => {
  const { name, email, phone, amount } = req.body;

  if (!email || !name || !amount) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"National Fellowship Conference" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your Donation Receipt",
      html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; background: #f9f9f9; padding: 20px;">
        <div style="max-width: 700px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          
          <div style="background: #2c3e50; color: #fff; padding: 25px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Thank You for Your Donation</h1>
          </div>

          <div style="padding: 25px; line-height: 1.6; font-size: 15px; color: #333;">
            <p>Dear ${name},</p>
            
            <p>
              Thank you for your generous donation of 
              <strong style="color: #27ae60;">$${amount}</strong>. 
              Your contribution means a lot and will be put to good use in making a difference.
            </p>
            
            <p>
              We have sent your donation receipt to your email.
              <br /><br />
              <strong>The National Fellowship Conference of Christian Churches, Inc.</strong><br/>
              <strong>Tax Deductible IRS EIN: 22-2513753</strong>
            </p>

            <p>
              On behalf of the Board of Governors, Members, and Partners, we extend our gratitude and appreciation 
              for your support of our Ministries. It is our aim to obey and fulfill the Great Commission of Jesus Christ, 
              by going into all the world, sharing the good news of the love of God and the testimony of Jesus Christ to everyone 
              who will hear it. Using media, discipleship, training and education and mission programs, your contributions 
              support these endeavors in addition to general operations.
            </p>

            <p>
              The Board of Governors, Finance Committee will always direct funds received to the areas of ministry most needed, 
              and the use of all funds are with the highest degree of integrity and best practices.
            </p>

            <p>
              Thank you for participating in our Tithes and Offerings, Semi-annual Impact Giving, 
              Reach 1070 Covenant Faith Partner programs, and Unique Events.
            </p>

            <p>
              With gratitude,<br/>
              <strong>Dr. Gary Kirkwood, Sr.<br/>The Board of Governors</strong>
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;"/>

            <p><strong>List of Ministries:</strong></p>
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

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;"/>

            <p style="font-size: 13px; color: #777;">
              If you have any questions, please don't hesitate to contact us.<br/>
              <strong>Phone:</strong> ${phone || "N/A"}
            </p>
          </div>
        </div>
      </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ success: false, message: "Email sending failed." });
  }
});


module.exports = router;
