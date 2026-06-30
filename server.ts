import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality, MediaResolution } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // WebSocket Server for Gemini Live API
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/api/gemini-live')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs, request) => {
    // Get API key from query parameter or environment (if set)
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const apiKey = url.searchParams.get('key') || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      clientWs.close(1008, "Missing API Key");
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      }
    });

    try {
      const session = await ai.live.connect({
        model: "models/gemini-3.5-live-translate-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
          contextWindowCompression: {
            triggerTokens: 0,
            slidingWindow: { targetTokens: 0 },
          },
          translationConfig: {
            targetLanguageCode: "en",
          },
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify(message));
            }
          },
          onerror: (e) => {
            console.error('Gemini Error:', e);
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'error', message: e.message }));
            }
          },
          onclose: (e) => {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close();
            }
          }
        },
      });

      clientWs.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        // Handle input from client
        if (msg.audio) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      });

      clientWs.on("close", () => {
        session.close();
      });
      
    } catch (e) {
      console.error('Session Setup Error:', e);
      clientWs.close(1011, "Internal Server Error");
    }
  });
}

startServer();
