import { Router } from "express";
import { getGoogleAuthUrl, getProfile, updateProfile, uploadPhoto } from "../controllers/user.controller.js";
import { requireUserToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/auth/google-url", getGoogleAuthUrl);
router.get("/profile", requireUserToken, getProfile);
router.patch("/profile", requireUserToken, updateProfile);
router.post("/upload", requireUserToken, uploadPhoto);

export default router;
