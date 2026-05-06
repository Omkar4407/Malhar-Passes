import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import 'dotenv/config'

dotenv.config();

import authRoutes from "./routes/auth.routes.js";
import otpRoutes from "./routes/otp.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import scannerRoutes from "./routes/scanner.routes.js";
import eventsRoutes  from "./routes/events.routes.js";

const app = express();

// Render (and most cloud platforms) sit behind a reverse proxy.
// This tells Express to trust the X-Forwarded-For header so
// express-rate-limit can correctly identify client IPs.
app.set("trust proxy", 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// ── Health check (keeps Render free tier awake via UptimeRobot) ───────────────
app.get("/health", (req, res) => res.json({ ok: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/", authRoutes);
app.use("/", otpRoutes);
app.use("/", bookingRoutes);
app.use("/", scannerRoutes);
app.use("/", eventsRoutes);

// ── Use PORT from environment (Render sets this automatically) ────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));