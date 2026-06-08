import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { CATALOG } from "./src/data/books.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

  // API router / endpoints
  app.get("/api/health", async (req, res) => {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/health`);
      if (backendRes.ok) {
        const data = await backendRes.json();
        return res.json(data);
      }
    } catch (e) {
      console.warn("FastAPI backend health check failed:", e);
    }
    res.json({ status: "ok", catalogSize: CATALOG.length });
  });

  // GET/POST endpoint to fetch catalog books directly (nice addition for UX to browse)
  app.get("/api/books", (req, res) => {
    res.json(CATALOG);
  });

  // POST /api/feedback proxy
  app.post("/api/feedback", async (req, res) => {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      });
      
      const data = await backendRes.json();
      return res.status(backendRes.status).json(data);
    } catch (e) {
      console.warn("FastAPI backend /api/feedback failed:", e);
      return res.status(500).json({ error: "Backend unreachable" });
    }
  });

  // POST /ask and /api/ask handler
  const askHandler = async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { question, prompt, query } = req.body;
    const userQuery = question || prompt || query || "";

    if (!userQuery.trim()) {
      return res.status(400).json({
        error: "A pergunta não pode estar vazia."
      });
    }

    // Try proxying to FastAPI backend first
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuery })
      });
      
      if (backendRes.ok) {
        const data = await backendRes.json();
        
        // Ensure the Correlation ID is forwarded to the React frontend
        // so it can link the feedback back to this request in the DB
        const corrId = backendRes.headers.get("x-correlation-id") || backendRes.headers.get("X-Correlation-ID");
        if (corrId) {
          res.setHeader("X-Correlation-ID", corrId);
          res.setHeader("Access-Control-Expose-Headers", "X-Correlation-ID");
        }
        
        return res.json(data);
      } else {
        return res.status(backendRes.status).json({ error: "Backend error" });
      }
    } catch (error: any) {
      console.error("Curation compilation error or Backend Unreachable:", error);
      return res.status(500).json({
        error: "O Backend de Inteligência Artificial está indisponível no momento."
      });
    }
  };

  app.post("/ask", askHandler);
  app.post("/api/ask", askHandler);

  // POST /api/ask/stream handler for Server-Sent Events
  app.post("/api/ask/stream", async (req, res) => {
    const { question, prompt, query } = req.body;
    const userQuery = question || prompt || query || "";

    if (!userQuery.trim()) {
      return res.status(400).json({ error: "A pergunta não pode estar vazia." });
    }

    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/ask/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuery })
      });

      if (backendRes.ok) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const corrId = backendRes.headers.get("x-correlation-id") || backendRes.headers.get("X-Correlation-ID");
        if (corrId) {
          res.setHeader("X-Correlation-ID", corrId);
          res.setHeader("Access-Control-Expose-Headers", "X-Correlation-ID");
        }

        if (backendRes.body) {
          const reader = backendRes.body.getReader();
          const push = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
              res.end();
            } catch (e) {
              console.error("Stream read error:", e);
              res.end();
            }
          };
          push();
        } else {
          res.status(500).json({ error: "Sem stream no body" });
        }
      } else {
        return res.status(backendRes.status).json({ error: "Backend error" });
      }
    } catch (error: any) {
      console.error("Stream Proxy Error:", error);
      return res.status(500).json({ error: "O Backend de Inteligência Artificial está indisponível." });
    }
  });

  // Vite middleware for development (Vite or static server depending on env)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
