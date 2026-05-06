import { Router } from "express";
import {
  getEvents, getSlots,
  adminGetEvents, adminGetSlots,
  createEvent, updateEvent, deleteEvent,
  createSlot, updateSlot, deleteSlot,
} from "../controllers/events.controller.js";
import { requireAdminToken } from "../middleware/auth.middleware.js";

const router = Router();

// ── Public (no auth needed — events/slots are readable by anyone) ──────────────
router.get("/events",              getEvents);
router.get("/events/:id/slots",    getSlots);

// ── Admin-only ────────────────────────────────────────────────────────────────
router.get   ("/admin/events",        requireAdminToken, adminGetEvents);
router.get   ("/admin/slots",         requireAdminToken, adminGetSlots);
router.post  ("/admin/events",        requireAdminToken, createEvent);
router.patch ("/admin/events/:id",    requireAdminToken, updateEvent);
router.delete("/admin/events/:id",    requireAdminToken, deleteEvent);
router.post  ("/admin/slots",         requireAdminToken, createSlot);
router.patch ("/admin/slots/:id",     requireAdminToken, updateSlot);
router.delete("/admin/slots/:id",     requireAdminToken, deleteSlot);

export default router;