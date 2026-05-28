import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeFirebase } from "./firebase";

const app = express();

// Serve uploaded files from client/public/uploads as static files
// This must be BEFORE other routes to ensure /uploads/* paths are served correctly
app.use('/uploads', express.static(path.join(process.cwd(), 'client', 'public', 'uploads')));


// Health check endpoints MUST be first - before any middleware
// This ensures Cloud Run health checks pass quickly
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/_health", (_req, res) => {
  res.status(200).send("OK");
});

// Capture raw body for webhook signature verification BEFORE json parsing
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  try {
    initializeFirebase();
  } catch (e) {
    log(`Firebase init skipped: ${e}`);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);

  if (isNaN(port) || port < 1 || port > 65535) {
    const error = `Invalid port configuration: ${process.env.PORT}. Port must be a number between 1 and 65535.`;
    log(error);
    process.exit(1);
  }

  log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  log(`Configured port: ${port} (from ${process.env.PORT ? 'PORT env var' : 'default'})`);
  log(`Host: 0.0.0.0 (accessible externally)`);

  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`Server successfully started on port ${port}`);
    log(`Application ready to accept requests`);
    if (!process.env.PAYMENT_ENCRYPTION_KEY) {
      console.warn("[WARN] PAYMENT_ENCRYPTION_KEY is not configured - payment gateway operations will fail");
    }
  }).on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      log(`Port ${port} is already in use. Please check if another instance is running.`);
    } else if (error.code === 'EACCES') {
      log(`Permission denied to bind to port ${port}. May require elevated privileges.`);
    } else {
      log(`Server startup failed: ${error.message}`);
    }
    log(`Full error details: ${JSON.stringify(error, null, 2)}`);
    process.exit(1);
  });
})();
