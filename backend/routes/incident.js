import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import {
    getIncidents,
    getIncident,
    updateIncidentStatus,
    updateIncidentPriority,
    addIncidentUpdate,
    addTicketToIncident,
    removeTicketFromIncident,
    getAvailableTickets,
    getIncidentActivity
} from "../controllers/incident.js";

const router = express.Router();

// All authenticated users can view incidents (globally visible)
router.get("/", authenticate, getIncidents);
router.get("/:id", authenticate, getIncident);
router.get("/:id/activity", authenticate, getIncidentActivity);
router.get("/:id/available-tickets", authenticate, authorize(['admin', 'manager']), getAvailableTickets);

// Only admin or manager (incident lead) can update
router.patch("/:id/status", authenticate, authorize(['admin', 'manager']), updateIncidentStatus);
router.patch("/:id/priority", authenticate, authorize(['admin', 'manager']), updateIncidentPriority);

// Incident updates/notes - employees assigned to linked tickets can also add
router.post("/:id/updates", authenticate, addIncidentUpdate);

// Ticket management
router.post("/:id/tickets", authenticate, authorize(['admin', 'manager']), addTicketToIncident);
router.delete("/:id/tickets/:ticketId", authenticate, authorize(['admin', 'manager']), removeTicketFromIncident);

export default router;
