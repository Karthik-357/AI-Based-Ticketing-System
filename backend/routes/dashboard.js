import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { getDashboardStats } from "../controllers/dashboard.js";

const router = express.Router();

router.get("/stats", authenticate, authorize(['admin', 'manager']), getDashboardStats);

export default router;
