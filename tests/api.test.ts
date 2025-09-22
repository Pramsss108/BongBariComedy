import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';

// Test configuration
const API_BASE = process.env.VITE_API_BASE || 'http://localhost:5000';
const TEST_USER = {
  username: 'admin',
  password: 'bongbari2025'
};

let authToken = '';
let csrfToken = '';

describe('BongBari API Tests', () => {
  beforeAll(async () => {
    console.log(`Testing against: ${API_BASE}`);
  });

  describe('Authentication Tests', () => {
    test('should get health status', async () => {
      const response = await fetch(`${API_BASE}/api/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('ok', true);
      expect(data).toHaveProperty('aiReady');
    });

    test('should get version info', async () => {
      const response = await fetch(`${API_BASE}/api/version`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('nodeVersion');
    });

    test('should login successfully with valid credentials', async () => {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(TEST_USER),
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('sessionId');
      expect(data).toHaveProperty('csrfToken');
      expect(data).toHaveProperty('username');
      
      // Store tokens for subsequent tests
      authToken = data.sessionId;
      csrfToken = data.csrfToken;
    });

    test('should fail login with invalid credentials', async () => {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'invalid',
          password: 'wrong'
        }),
      });
      
      expect(response.status).toBe(401);
    });

    test('should get user info with valid token', async () => {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('username', TEST_USER.username);
    });

    test('should fail to access protected route without token', async () => {
      const response = await fetch(`${API_BASE}/api/auth/me`);
      
      expect(response.status).toBe(401);
    });

    test('should refresh CSRF token', async () => {
      const response = await fetch(`${API_BASE}/api/auth/csrf-token`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('csrfToken');
      
      // Update CSRF token for subsequent tests
      csrfToken = data.csrfToken;
    });
  });

  describe('Chatbot Tests', () => {
    test('should check chatbot readiness', async () => {
      const response = await fetch(`${API_BASE}/api/ai/ready`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('ok');
      expect(data).toHaveProperty('aiReady');
      expect(data).toHaveProperty('aiKeyPresent');
    });

    test('should get Bengali comedy tips', async () => {
      const response = await fetch(`${API_BASE}/api/chatbot/tips`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tips');
      expect(typeof data.tips).toBe('string');
      expect(data.tips.length).toBeGreaterThan(0);
    });

    test('should respond to chatbot message', async () => {
      const testMessage = {
        message: 'Hello, can you tell me about BongBari?',
        language: 'en'
      };

      const response = await fetch(`${API_BASE}/api/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('response');
      expect(typeof data.response).toBe('string');
      expect(data.response.length).toBeGreaterThan(0);
    });

    test('should handle Bengali chatbot message', async () => {
      const testMessage = {
        message: 'BongBari সম্পর্কে বলুন',
        language: 'bn'
      };

      const response = await fetch(`${API_BASE}/api/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('response');
      expect(typeof data.response).toBe('string');
    });
  });

  describe('Community Feed Tests (Bong Kahini)', () => {
    test('should get community feed', async () => {
      const response = await fetch(`${API_BASE}/api/community/feed`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      
      // Check structure of feed items
      if (data.length > 0) {
        const post = data[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('text');
        expect(post).toHaveProperty('language');
        expect(post).toHaveProperty('createdAt');
      }
    });

    test('should submit community story for moderation', async () => {
      const testStory = {
        text: 'এটি একটি পরীক্ষামূলক বাংলা গল্প। আমার মা সবসময় বলেন, "ভাত খেয়েছিস?"',
        author: 'Test Author',
        language: 'bn'
      };

      const response = await fetch(`${API_BASE}/api/community/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testStory),
      });
      
      // Should return 201 for successful submission to moderation queue
      expect([200, 201]).toContain(response.status);
    });

    test('should moderate story content', async () => {
      const testContent = {
        text: 'আমার মা সবসময় বলেন, তুই কিছু খেয়েছিস কি না!',
        language: 'bn'
      };

      const response = await fetch(`${API_BASE}/api/moderate-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testContent),
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      if (data.status === 'review_suggested') {
        expect(data).toHaveProperty('reason');
        expect(data).toHaveProperty('flags');
      }
    });

    test('should handle story reactions', async () => {
      // First get the community feed to find a post to react to
      const feedResponse = await fetch(`${API_BASE}/api/community/feed`);
      const feed = await feedResponse.json();
      
      if (feed.length > 0) {
        const postId = feed[0].id;
        const reactionData = {
          postId: postId,
          reaction: 'laugh'
        };

        const response = await fetch(`${API_BASE}/api/community/react`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reactionData),
        });
        
        // Should succeed or fail gracefully
        expect([200, 400, 429]).toContain(response.status);
      }
    });
  });

  describe('Admin Features Tests', () => {
    test('should get pending moderation queue (authenticated)', async () => {
      const response = await fetch(`${API_BASE}/api/admin/list-pending`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      
      // Check structure of pending items
      if (data.length > 0) {
        const item = data[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('text');
        expect(item).toHaveProperty('moderationFlags');
      }
    });

    test('should fail to access admin features without auth', async () => {
      const response = await fetch(`${API_BASE}/api/admin/list-pending`);
      
      expect(response.status).toBe(401);
    });

    test('should get collaboration requests (authenticated)', async () => {
      const response = await fetch(`${API_BASE}/api/collaboration-requests`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Blog and Content Tests', () => {
    test('should get blog posts', async () => {
      const response = await fetch(`${API_BASE}/api/blog`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      
      // Check structure of blog posts
      if (data.length > 0) {
        const post = data[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('slug');
      }
    });

    test('should get trending data', async () => {
      const response = await fetch(`${API_BASE}/api/trends`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  afterAll(async () => {
    // Cleanup: logout if needed
    if (authToken) {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-CSRF-Token': csrfToken,
        },
      });
    }
  });
});