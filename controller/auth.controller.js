import crypto from "crypto";
import { sendBrevoEmail } from "../utils/brevo.js";
import { loadEnv } from "../config/env.js";
import Profile from "../model/profile.model.js";
import UserSession from "../model/session.model.js";

loadEnv();

const otpStore = new Map(); // email -> { code, expires }
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getBrevoConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY,
    fromEmail: process.env.BREVO_FROM_EMAIL,
    fromName: process.env.BREVO_FROM_NAME || "Gram Ansh",
  };
}

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email required" });

    const { apiKey: brevoApiKey, fromEmail: brevoFromEmail, fromName: brevoFromName } =
      getBrevoConfig();

    if (!brevoApiKey || !brevoFromEmail) {
      return res
        .status(500)
        .json({ message: "Email service not configured on server" });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expires = Date.now() + OTP_TTL_MS;
    otpStore.set(email, { code, expires });

    const subject = "Your Gram Ansh Login Code";
    const textContent = `Your Gram Ansh login code is ${code}. It expires in 10 minutes.`;
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2d5016;">Your Gram Ansh Login Code</h2>
        <p>Enter the following verification code to sign in to your Gram Ansh account:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p>This verification code expires in 10 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this login code, you can safely ignore this email.</p>
      </div>
    `;

    const doSend = process.env.EMAIL_DRY_RUN !== "true";

    if (doSend) {
      await sendBrevoEmail({
        apiKey: brevoApiKey,
        fromEmail: brevoFromEmail,
        fromName: brevoFromName,
        toEmail: email,
        subject,
        textContent,
        htmlContent,
      });
    } else {
      console.log(`[EMAIL_DRY_RUN] OTP for ${email}: ${code}`);
    }

    return res.status(200).json({ status: true, message: "OTP sent" });
  } catch (error) {
    console.error("sendOtp error:", error);
    return res
      .status(500)
      .json({ status: false, message: error.message || "Failed to send OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP required" });
  }

  const entry = otpStore.get(email);
  if (!entry) return res.status(400).json({ message: "OTP expired or not found" });
  if (Date.now() > entry.expires) {
    otpStore.delete(email);
    return res.status(400).json({ message: "OTP expired" });
  }
  if (entry.code !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  otpStore.delete(email);

  // Find or create user profile
  let profile = await Profile.findOne({ email: email.toLowerCase() });
  if (profile?.isBlocked) {
    return res.status(403).json({
      status: false,
      message: profile.blockedReason
        ? `You are blocked: ${profile.blockedReason}`
        : "You are blocked. Please contact support.",
    });
  }
  const isNew = !profile;

  if (!profile) {
    profile = new Profile({ email: email.toLowerCase(), name: "" });
    await profile.save();
  }

  // Generate session token
  const token = crypto.randomUUID();
  const ttlDays = 30;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  const session = new UserSession({
    session_id: token,
    email: email.toLowerCase(),
    expiresAt,
  });
  await session.save();

  return res.status(200).json({
    status: true,
    message: "OTP verified",
    token,
    email,
    isNew,
    profile: {
      email: profile.email,
      name: profile.name,
    },
  });
};
