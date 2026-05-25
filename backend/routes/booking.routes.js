import { Router } from "express";
import { createOrder, verifyPayment, bookFree, getMyTickets, checkSlot } from "../controllers/booking.controller.js";
import { requireUserToken } from "../middleware/auth.middleware.js";
import { paymentLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// All booking routes require a valid user JWT
router.get ("/my-tickets",    requireUserToken, getMyTickets);
router.post("/create-order",  requireUserToken, paymentLimiter, createOrder);
router.post("/verify-payment",requireUserToken, paymentLimiter, verifyPayment);
router.post("/book-free",     requireUserToken, paymentLimiter, bookFree);
router.get ("/check-slot",     requireUserToken, checkSlot);

export default router;