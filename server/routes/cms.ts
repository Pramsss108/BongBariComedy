import { Express } from "express";
import { storage } from "../storage";
import { youtubeService } from "../youtubeService";
import { memeService } from "../memeService";
import { insertBlogPostSchema } from "@shared/schema";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function registerCmsRoutes(app: Express) {
    // Blog
    app.get("/api/blog", async (_req, res) => {
        try { res.json(await storage.getBlogPosts()); } catch { res.status(500).json({ message: "Failed" }); }
    });

    app.get("/api/blog/slug/:slug", async (req, res) => {
        try {
            const post = await storage.getBlogPostBySlug(req.params.slug);
            if (!post) return res.status(404).json({ message: "Not found" });
            res.json(post);
        } catch { res.status(500).json({ message: "Failed" }); }
    });

    // YouTube logic
    app.get("/api/youtube/latest", async (req, res) => {
        try {
            const channelId = (req.query.channelId as string) || process.env.YOUTUBE_CHANNEL_ID;
            if (!channelId) return res.json([]);
            youtubeService.start(channelId);
            await youtubeService.forceRefresh();
            res.json(youtubeService.getLatest(3));
        } catch { res.status(200).json([]); }
    });

    // Meme logic
    app.get('/api/memes/public', async (_req, res) => {
        try { res.json({ items: memeService.getPublic(30) }); } catch { res.status(500).json({ error: 'Failed' }); }
    });

    // Collaboration Leads Export (Excel/PDF)
    app.get("/api/collaboration-requests/export", async (req, res) => {
        try {
            const { leadStatus, format = 'csv' } = req.query;
            const requests = await storage.getCollaborationRequests({ leadStatus });
            const exportData = requests.map(r => ({
                Name: r.name, Email: r.email, Company: r.company, Status: r.status
            }));

            if (format === 'xlsx') {
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Leads');
                const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="leads.xlsx"`);
                return res.send(buf);
            }
            // Simplified CSV response for now
            res.setHeader('Content-Type', 'text/csv');
            res.send(JSON.stringify(exportData));
        } catch { res.status(500).json({ message: "Export failed" }); }
    });
}
