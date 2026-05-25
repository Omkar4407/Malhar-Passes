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
router.get("/get-events",          getEvents);
router.get("/events/:id/slots",    getSlots);
router.get("/get-slots",           getSlots);

// ── Admin-only ────────────────────────────────────────────────────────────────
router.get   ("/admin/events",        requireAdminToken, adminGetEvents);
router.get   ("/admin-events",        requireAdminToken, adminGetEvents);
router.get   ("/admin/slots",         requireAdminToken, adminGetSlots);
router.get   ("/admin-slots",         requireAdminToken, adminGetSlots);
router.post  ("/admin/events",        requireAdminToken, createEvent);
router.post  ("/admin-events",        requireAdminToken, createEvent);
router.patch ("/admin/events/:id",    requireAdminToken, updateEvent);
router.patch ("/admin-events",        requireAdminToken, updateEvent);
router.delete("/admin/events/:id",    requireAdminToken, deleteEvent);
router.delete("/admin-events",        requireAdminToken, deleteEvent);
router.post  ("/admin/slots",         requireAdminToken, createSlot);
router.post  ("/admin-slots",         requireAdminToken, createSlot);
router.patch ("/admin/slots/:id",     requireAdminToken, updateSlot);
router.patch ("/admin-slots",         requireAdminToken, updateSlot);
router.delete("/admin/slots/:id",     requireAdminToken, deleteSlot);
router.delete("/admin-slots",         requireAdminToken, deleteSlot);

export default router;