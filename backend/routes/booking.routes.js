import { Router } from "express";
import { createOrder, verifyPayment, bookFree, getMyTickets } from "../controllers/booking.controller.js";
import { requireVerifiedPhone } from "../middleware/auth.middleware.js";
import { paymentLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// All booking routes require a valid user JWT
router.get ("/my-tickets",    requireVerifiedPhone, getMyTickets);
router.post("/create-order",  requireVerifiedPhone, paymentLimiter, createOrder);
router.post("/verify-payment",requireVerifiedPhone, paymentLimiter, verifyPayment);
router.post("/book-free",     requireVerifiedPhone, paymentLimiter, bookFree);

export default router;