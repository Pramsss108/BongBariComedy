import { Express } from "express";
import { insertUserSchema } from "@shared/schema";
import { storage } from "../storage";
import { z } from "zod";
import { generateCSRFToken } from "../middleware/security";

export function registerAuthRoutes(app: Express, sessions: Map<string, any>) {
    // Authentication routes with enhanced security
    app.post("/api/auth/login", async (req, res) => {
        try {
            const { username, password } = insertUserSchema.parse(req.body);
            let user = await storage.getUserByUsername(username);

            // Auto-bootstrap admin if missing
            const adminEnvPass = process.env.ADMIN_PASSWORD || 'bongbari2025';
            if (!user && username === 'admin' && password === adminEnvPass) {
                try {
                    user = await storage.createUser({ username: 'admin', password: adminEnvPass });
                    console.log('✅ Admin auto-created on login');
                } catch (e) {
                    user = await storage.getUserByUsername(username);
                }
            }

            const validPassword = user && (
                user.password === password || (username === 'admin' && password === adminEnvPass)
            );

            if (!user || !validPassword) {
                return res.status(401).json({ message: "Invalid username or password" });
            }

            const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            sessions.set(sessionId, {
                username: user.username,
                createdAt: new Date()
            });

            const csrfToken = generateCSRFToken(sessionId);
            res.json({ sessionId, username: user.username, csrfToken });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid login data", errors: error.errors });
            }
            res.status(500).json({ message: "Login failed" });
        }
    });

    app.post("/api/auth/logout", (req, res) => {
        const sessionId = req.headers.authorization?.replace('Bearer ', '');
        if (sessionId) {
            sessions.delete(sessionId);
        }
        res.json({ message: "Logged out successfully" });
    });

    app.get("/api/auth/me", (req: any, res) => {
        // Note: isAuthenticated middleware should be applied in the main registerRoutes 
        // or passed to this function. For simplicity in transition, we assume it's checked.
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        res.json({ username: req.user.username });
    });

    app.get("/api/auth/csrf-token", (req: any, res) => {
        const sessionId = req.sessionId || req.headers.authorization?.replace('Bearer ', '');
        if (!sessionId || !sessions.has(sessionId)) {
            return res.status(401).json({ message: "No session found" });
        }
        const csrfToken = generateCSRFToken(sessionId);
        res.json({ csrfToken });
    });

    app.post("/api/auth/create-admin", async (req, res) => {
        try {
            const existingUser = await storage.getUserByUsername('admin');
            if (existingUser) {
                return res.status(400).json({ message: "Admin user already exists" });
            }

            const adminUser = await storage.createUser({
                username: 'admin',
                password: 'bongbari2025'
            });

            res.json({ message: "Admin user created", username: adminUser.username });
        } catch (error) {
            res.status(500).json({ message: "Failed to create admin user" });
        }
    });

    app.post("/api/auth/create-user", async (req, res) => {
        try {
            const { username, password } = insertUserSchema.parse(req.body);
            const existingUser = await storage.getUserByUsername(username);
            if (existingUser) {
                return res.status(400).json({ message: "Username already exists" });
            }
            const newUser = await storage.createUser({ username, password });
            res.json({ message: "User created successfully", username: newUser.username });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid user data", errors: error.errors });
            }
            res.status(500).json({ message: "Failed to create user" });
        }
    });
}
