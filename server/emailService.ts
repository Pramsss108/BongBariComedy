import { MailService } from '@sendgrid/mail';
import { randomUUID } from 'crypto';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface VerificationEmailParams {
  to: string;
  name: string;
  verificationToken: string;
  baseUrl: string;
}

interface OTPEmailParams {
  to: string;
  name: string;
  otpCode: string;
}

export async function sendVerificationEmail(params: VerificationEmailParams): Promise<boolean> {
  try {
    const verificationUrl = `${params.baseUrl}/verify-email?token=${params.verificationToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FCD34D, #F59E0B); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .button { background: #1E40AF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #1E40AF; margin: 0;">🎭 Bong Bari</h1>
            <p style="color: #1E40AF; margin: 10px 0 0 0;">Bengali Comedy Platform</p>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hello ${params.name},</p>
            <p>Thank you for your interest in collaborating with Bong Bari! To complete your collaboration request, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
            
            <p>This verification link will expire in 24 hours.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request this verification, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>© 2025 Bong Bari - Bringing laughter to Bengali families</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await mailService.send({
      to: params.to,
      from: 'noreply@bongbari.com', // You'll need to verify this domain in SendGrid
      subject: '🎭 Verify Your Email - Bong Bari Collaboration',
      text: `Hello ${params.name}, please verify your email by visiting: ${verificationUrl}`,
      html: emailHtml,
    });
    
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export function generateVerificationToken(): string {
  return randomUUID();
}

export function generateOTPCode(): string {
  // Generate a 6-digit OTP code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTPEmail(params: OTPEmailParams): Promise<boolean> {
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FCD34D, #F59E0B); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .otp-code { background: #F3F4F6; border: 2px dashed #1E40AF; padding: 20px; margin: 20px 0; text-align: center; border-radius: 10px; }
          .otp-digits { font-size: 36px; font-weight: bold; color: #1E40AF; letter-spacing: 8px; font-family: monospace; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #1E40AF; margin: 0;">🎭 Bong Bari</h1>
            <p style="color: #1E40AF; margin: 10px 0 0 0;">Bengali Comedy Platform</p>
          </div>
          <div class="content">
            <h2>Your Verification Code</h2>
            <p>Hello ${params.name},</p>
            <p>Thank you for your interest in collaborating with Bong Bari! Here's your verification code:</p>
            
            <div class="otp-code">
              <p style="margin: 0; font-size: 16px; color: #374151;">Your 6-digit code:</p>
              <div class="otp-digits">${params.otpCode}</div>
              <p style="margin: 0; font-size: 14px; color: #6B7280;">Enter this code on our website to verify your request</p>
            </div>
            
            <p>⏰ This code will expire in <strong>10 minutes</strong> for security.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request this verification code, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>© 2025 Bong Bari - Bringing laughter to Bengali families</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await mailService.send({
      to: params.to,
      from: 'noreply@bongbari.com',
      subject: '🎭 Your Verification Code - Bong Bari',
      text: `Hello ${params.name}, your verification code is: ${params.otpCode}. This code expires in 10 minutes.`,
      html: emailHtml,
    });
    
    return true;
  } catch (error) {
    console.error('SendGrid OTP email error:', error);
    return false;
  }
}