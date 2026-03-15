import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Client } from '@gradio/client';

type Bindings = {
    BONGBARI_AUDIO_BUCKET: R2Bucket;
    HF_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for the frontend
app.use('/*', cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
}));

// --- R2 Storage Endpoints ---

// 1. Upload audio to R2
app.post('/api/r2/upload', async (c) => {
    try {
        const formData = await c.req.parseBody();
        const audioFile = formData['audio'] as File;
        const fileName = formData['fileName'] as string || `audio-${Date.now()}.wav`;

        if (!audioFile) {
            return c.json({ error: 'No audio file provided' }, 400);
        }

        const arrayBuffer = await audioFile.arrayBuffer();

        // Save to R2
        await c.env.BONGBARI_AUDIO_BUCKET.put(fileName, arrayBuffer, {
            httpMetadata: { contentType: audioFile.type || 'audio/wav' },
        });

        // Provide the access URL (Worker acts as the proxy for R2 reads)
        const url = new URL(c.req.url);
        const downloadUrl = `${url.origin}/api/r2/audio/${fileName}`;

        return c.json({ success: true, url: downloadUrl, fileName });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// 2. Read audio from R2
app.get('/api/r2/audio/:fileName', async (c) => {
    const fileName = c.req.param('fileName');
    const object = await c.env.BONGBARI_AUDIO_BUCKET.get(fileName);

    if (!object) {
        return c.json({ error: 'Audio not found in R2' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    return new Response(object.body, { headers });
});

// --- ZeroGPU XTTS Voice Cloning Proxy ---

// 3. Proxy for Gradio zero-gpu requests (avoids exposing HF_TOKEN in browser)
// The browser will use @gradio/client but point it at THIS endpoint, or
// we can just handle the POST directly and let the Worker use @gradio/client.
// But we cannot use Node.js @gradio/client inside CF Worker easily because of dependencies.
// Instead, we will proxy the raw REST calls to huggingface space.

app.post('/api/xtts/clone', async (c) => {
    try {
        const formData = await c.req.parseBody();

        const audioFile = formData['audio'] as File;
        const text = formData['text'] as string;
        const language = formData['language'] as string || 'en';

        if (!audioFile || !text) {
            return c.json({ error: 'Missing audio or text' }, 400);
        }

        // Coqui XTTS Space (https://huggingface.co/spaces/coqui/xtts)
        // This space frequently is overloaded, but we'll try to use a highly available zeroGPU clone space if needed.
        // Usually, people use standard Gradio API structure.

        return c.json({ error: 'Please submit gradio request' }, 400);

    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

export default app;
