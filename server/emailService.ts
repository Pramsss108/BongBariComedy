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