import express from "express";
import {authenticate} from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import {
    getTickets,
    getTicket,
    createTicket,
    updateTicket,
    getTicketActivities,
    requestCollaboration,
    reviewCollaboration
} from "../controllers/ticket.js"

const router = express.Router();

router.get("/", authenticate, getTickets)
router.get("/:id/activities", authenticate, getTicketActivities)
router.get("/:id", authenticate, getTicket)
router.post("/", authenticate, createTicket)
router.patch("/:id", authenticate, authorize(['admin', 'manager', 'employee']), updateTicket)
router.post("/:id/collaboration/request", authenticate, authorize(['admin', 'manager', 'employee']), requestCollaboration)
router.post("/:id/collaboration/review", authenticate, authorize(['admin', 'manager']), reviewCollaboration)

export default router;
