// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Validate SESSION_SECRET at startup to prevent runtime failures
if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET environment variable must be set. This is required for secure session management."
  );
}

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error for debugging but don't expose stack trace to client
    console.error('[Error Handler]', {
      status,
      message: err.message,
      stack: err.stack,
    });

    // Don't expose internal error details in production
    const clientMessage = process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal Server Error'
      : message;

    res.status(status).json({ message: clientMessage });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);

    // Start intelligence background tasks
    import('./services/intelligence-background').then(({ startIntelligenceBackgroundTasks }) => {
      startIntelligenceBackgroundTasks();
    }).catch((error) => {
      console.error('Failed to start intelligence background tasks:', error);
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    log('SIGTERM received, shutting down gracefully');

    // Stop intelligence background tasks
    const { stopIntelligenceBackgroundTasks, saveIntelligenceStates } = await import('./services/intelligence-background');
    stopIntelligenceBackgroundTasks();

    // Save states one last time
    await saveIntelligenceStates();

    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
  });
})();
