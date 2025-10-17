import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === 'production' 
    ? 'https://www.bongbari.com/api/auth/google/callback'
    : 'http://localhost:5173/api/auth/google/callback'
);

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export class GoogleAuthService {
  /**
   * Generate Google OAuth URL for user authentication
   */
  static getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
    });
  }

  /**
   * Exchange authorization code for user information
   */
  static async getUserInfo(code: string): Promise<GoogleUserInfo> {
    try {
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data } = await oauth2.userinfo.get();

      return {
        id: data.id!,
        email: data.email!,
        name: data.name || 'User',
        picture: data.picture || undefined,
        given_name: data.given_name || undefined,
        family_name: data.family_name || undefined,
      };
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  /**
   * Verify if Google OAuth is properly configured
   */
  static isConfigured(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
}