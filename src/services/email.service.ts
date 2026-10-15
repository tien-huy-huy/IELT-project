/**
 * Email verification + sending example (TypeScript)
 *
 * Install deps:
 *   npm install nodemailer
 *   npm install -D @types/nodemailer @types/node
 *
 * Node's built-in `dns` and `net` modules are used for verification,
 * so no extra packages are needed for that part.
 */

import nodemailer from "nodemailer";
import crypto from "crypto";
import {redisClient} from "../utils/redis";
import { UserData } from "../types/user.type";

// ---------------------------------------------------------------------------
// 1. Syntax validation
// ---------------------------------------------------------------------------

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidSyntax(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}


// ---------------------------------------------------------------------------
// 4. Double opt-in verification — the reliable approach used in production
//
// Generate a token, store it against the email + expiry, email a link
// containing the token, and mark the address verified only when the
// link is visited / code is submitted.
// ---------------------------------------------------------------------------

interface PendingUser {
    id: string;
    email: string;
    name: string;
}



export async function createVerificationToken(User: UserData): Promise<string> {
  const token = crypto.randomBytes(24).toString("hex");
  const PendingUser: PendingUser = {
    id: User.id,
    email: User.email,
    name: User.name
  };
  await redisClient.set(
    `verification:${token}`,
    JSON.stringify(PendingUser),
    {
      EX:  process.env.VERIFICATION_TOKEN_EXPIRY ? parseInt(process.env.VERIFICATION_TOKEN_EXPIRY) : 1800, // 30 minutes
    }// 30 minute expiry
  );
  return token;
}

export async function confirmVerificationToken(token: string): Promise  <PendingUser | null> {
  const key = `verification:${token}`;

  const data = await redisClient.get(key);
  
  if (!data){
    return null;
  }

  await redisClient.del(token);

  return JSON.parse(data) as PendingUser;
}

// ---------------------------------------------------------------------------
// Sending the verification email with nodemailer
// ---------------------------------------------------------------------------

// Configure this with your real SMTP provider (SendGrid, Postmark, SES,
// Mailgun, Gmail with an app password, etc). Never hardcode credentials —
// use environment variables.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g. "smtp.sendgrid.net"
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false, // true for port 465, false for 587/25
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(
  email: string,
  token: string,
  baseUrl = "http://localhost:3001/auth/verify-email"
): Promise<void> {
  const link = `${baseUrl}?token=${token}`;

  await transporter.sendMail({
    from: `"IELTS Practice" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Please confirm your email address",
    text: `Confirm your email by visiting: ${link}`,
    html: `<p>Click below to confirm your email address:</p>
           <p><a href="${link}">Confirm Email</a></p>
           <p>This link expires in 30 minutes.</p>`,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  await transporter.sendMail({
    from: `"IELTS Practice" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `IELTS Practice - Welcome ${name}!`,
    html: `<p>Welcome to IELTS Practice! Your email has been successfully verified.<p>
            <p>We are excited to have you on board and look forward to helping you achieve your goals.</p>
            <p>Best regards,<br/>The IELTS Practice Team</p>`,
  });
}



