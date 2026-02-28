import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Initialize firebase admin from environment variable
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Expected to be a JSON string of the service account key
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin SDK Initialized Successfully.");
    } else {
        // Fallback for development if no service account is provided yet
        console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT not found in environment. Auth verification will fail.");
    }
} catch (e) {
    console.error("❌ Failed to initialize Firebase Admin. Invalid FIREBASE_SERVICE_ACCOUNT format.");
}

// Extend Express Request object to hold the decoded user
declare global {
    namespace Express {
        interface Request {
            firebaseUser?: admin.auth.DecodedIdToken;
        }
    }
}

/**
 * Middleware to strictly verify the Firebase ID Token.
 * If valid, attaches the decoded token to `req.firebaseUser`.
 * If invalid or missing, rejects the request.
 */
export const requireFirebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header built on Bearer token.' });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();

    try {
        // If admin isn't initialized, this will throw
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.firebaseUser = decodedToken;
        next();
    } catch (error) {
        console.error('Firebase Auth Verification Error:', error);
        return res.status(403).json({ error: 'Forbidden: Invalid or expired access token.' });
    }
};
