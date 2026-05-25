import { Router } from "express";
import { getTicket, checkIn, rejectTicket, toggleReleaseSlot, scannerCheckin } from "../controllers/scanner.controller.js";
import { requireAdminToken, requireScannerToken } from "../middleware/auth.middleware.js";

const router = Router();

// Scanner ops — accessible by both scanner and super_admin roles
router.get ("/scanner/ticket/:id",        requireScannerToken, getTicket);
router.get ("/scanner-ticket",            requireScannerToken, getTicket);

router.post("/scanner/checkin/:id",       requireScannerToken, checkIn);
router.post("/scanner/reject/:id",        requireScannerToken, rejectTicket);
router.post("/scanner-checkin",           requireScannerToken, scannerCheckin);

// Admin only
router.post("/admin/toggle-release-slot", requireAdminToken, toggleReleaseSlot);
router.post("/toggle-release-slot",       requireAdminToken, toggleReleaseSlot);

export default router;