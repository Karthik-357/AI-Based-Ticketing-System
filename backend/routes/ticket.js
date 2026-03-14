import express from "express";
import {authenticate} from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { getTickets, getTicket, createTicket, updateTicket, getTicketActivities } from "../controllers/ticket.js"

const router = express.Router();

router.get("/", authenticate, getTickets)
router.get("/:id/activities", authenticate, getTicketActivities)
router.get("/:id", authenticate, getTicket)
router.post("/", authenticate, createTicket)
router.patch("/:id", authenticate, authorize(['admin', 'manager', 'employee']), updateTicket)

export default router;
