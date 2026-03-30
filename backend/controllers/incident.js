import Incident from "../models/incident.js";
import Ticket from "../models/ticket.js";
import User from "../models/user.js";
import Comment from "../models/comment.js";
import TicketActivity from "../models/ticketActivity.js";
import IncidentActivity from "../models/incidentActivity.js";
import { sendMail } from "../utils/mailer.js";

// Helper to check if user can manage incident
const canManageIncident = (user, incident) => {
    return user.role === 'admin' || incident.incidentLead?._id?.toString() === user._id.toString();
};

// Helper to check if user is assigned to any ticket in the incident
const isAssignedToIncidentTicket = async (userId, ticketIds) => {
    const assignedTicket = await Ticket.findOne({
        _id: { $in: ticketIds },
        assignedTo: userId
    });
    return !!assignedTicket;
};

export const getIncidents = async (req, res) => {
    try {
        const incidents = await Incident.find()
            .populate('department', 'name')
            .populate('incidentLead', 'email')
            .populate({
                path: 'tickets',
                select: 'ticketNumber title status priority',
            })
            .sort({ createdAt: -1 });

        res.json(incidents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getIncident = async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id)
            .populate('department', 'name')
            .populate('incidentLead', 'email role')
            .populate('updates.userId', 'email')
            .populate({
                path: 'tickets',
                populate: [
                    { path: 'createdBy', select: 'email' },
                    { path: 'assignedTo', select: 'email' },
                    { path: 'department', select: 'name' },
                ],
            });

        if (!incident) {
            return res.status(404).json({ error: "Incident not found" });
        }

        res.json({ incident });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateIncidentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ["investigating", "identified", "monitoring", "resolved"];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const incident = await Incident.findById(req.params.id)
            .populate('incidentLead', 'email');

        if (!incident) {
            return res.status(404).json({ error: "Incident not found" });
        }

        // Only the incident lead (department manager) or admin can update
        const user = req.user;
        if (!canManageIncident(user, incident)) {
            return res.status(403).json({ error: "Only the incident lead or admin can update this incident" });
        }

        if (incident.status === "resolved") {
            return res.status(400).json({ error: "Cannot update a resolved incident" });
        }

        const oldStatus = incident.status;

        if (status === "resolved") {
            // Phase 3: Resolve — bulk update all linked tickets
            const ticketIds = incident.tickets;

            const incNumber = `INC-${String(incident.incidentNumber).padStart(3, '0')}`;

            // Fetch tickets BEFORE bulk update to capture original status for activity logs
            const tickets = await Ticket.find({ _id: { $in: ticketIds } })
                .populate('createdBy', 'email');

            // Bulk update all tickets to DONE and clear incident reference
            await Ticket.updateMany(
                { _id: { $in: ticketIds } },
                { status: "DONE", incident: null }
            );

            // Add system comment and activity to each ticket
            for (const ticket of tickets) {
                await Comment.create({
                    ticketId: ticket._id,
                    userId: user._id,
                    content: `Resolved as part of incident ${incNumber}`,
                });

                await TicketActivity.create({
                    ticketId: ticket._id,
                    performedBy: user._id,
                    action: 'INCIDENT_RESOLVED',
                    oldValue: ticket.status,
                    newValue: 'DONE',
                });
            }

            // Update incident
            incident.status = "resolved";
            incident.resolvedAt = new Date();
            await incident.save();

            // Log activity
            await IncidentActivity.create({
                incidentId: incident._id,
                performedBy: user._id,
                action: 'RESOLVED',
                oldValue: oldStatus,
                newValue: 'resolved',
            });

            // Email all unique ticket raisers
            const uniqueRaisers = [...new Set(
                tickets.map(t => t.createdBy?.email).filter(Boolean)
            )];

            for (const raiserEmail of uniqueRaisers) {
                try {
                    await sendMail(
                        raiserEmail,
                        `Incident ${incNumber} Resolved`,
                        `The incident ${incNumber} ("${incident.title}") has been resolved.\n\nYour ticket that was part of this incident has been marked as DONE.\n\nIf you still experience issues, please create a new ticket.`
                    );
                } catch (emailErr) {
                    console.error(`Failed to email raiser ${raiserEmail}:`, emailErr.message);
                }
            }

            // Email the incident lead
            try {
                await sendMail(
                    incident.incidentLead.email,
                    `Incident ${incNumber} Resolved`,
                    `Incident ${incNumber} ("${incident.title}") has been resolved.\n\n${tickets.length} tickets were bulk-updated to DONE.`
                );
            } catch (emailErr) {
                console.error("Failed to email incident lead:", emailErr.message);
            }
        } else {
            // Non-resolve status update
            incident.status = status;
            await incident.save();

            // Log activity
            await IncidentActivity.create({
                incidentId: incident._id,
                performedBy: user._id,
                action: 'STATUS_CHANGED',
                oldValue: oldStatus,
                newValue: status,
            });

            const incNumber = `INC-${String(incident.incidentNumber).padStart(3, '0')}`;

            // Send status update email to incident lead
            try {
                await sendMail(
                    incident.incidentLead.email,
                    `Incident ${incNumber} Status Update: ${status}`,
                    `Incident ${incNumber} ("${incident.title}") status changed from "${oldStatus}" to "${status}".`
                );
            } catch (emailErr) {
                console.error("Failed to email incident lead:", emailErr.message);
            }
        }

        const updatedIncident = await Incident.findById(req.params.id)
            .populate('department', 'name')
            .populate('incidentLead', 'email role')
            .populate({
                path: 'tickets',
                populate: [
                    { path: 'createdBy', select: 'email' },
                    { path: 'assignedTo', select: 'email' },
                    { path: 'department', select: 'name' },
                ],
            });

        res.json({ incident: updatedIncident, message: `Incident status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update incident priority
export const updateIncidentPriority = async (req, res) => {
    try {
        const { priority } = req.body;
        const validPriorities = ["P1", "P2", "P3", "P4"];

        if (!priority || !validPriorities.includes(priority)) {
            return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
        }

        const incident = await Incident.findById(req.params.id)
            .populate('incidentLead', 'email');

        if (!incident) {
            return res.status(404).json({ error: "Incident not found" });
        }

        if (!canManageIncident(req.user, incident)) {
            return res.status(403).json({ error: "Only the incident lead or admin can update this incident" });
        }

        if (incident.status === "resolved") {
            return res.status(400).json({ error: "Cannot update a resolved incident" });
        }

        const oldPriority = incident.priority;
        incident.priority = priority;
        await incident.save();

        // Log activity
        await IncidentActivity.create({
            incidentId: incident._id,
            performedBy: req.user._id,
            action: 'PRIORITY_CHANGED',
            oldValue: oldPriority,
            newValue: priority,
        });

        const updatedIncident = await Incident.findById(req.params.id)
            .populate('department', 'name')
            .populate('incidentLead', 'email role')
            .populate('updates.userId', 'email')
            .populate({
                path: 'tickets',
                populate: [
                    { path: 'createdBy', select: 'email' },
                    { path: 'assignedTo', select: 'email' },
                    { path: 'department', select: 'name' },
                ],
            });

        res.json({ incident: updatedIncident, message: `Priority updated to ${priority}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add update/note to incident
export const addIncidentUpdate = async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: "Update content is required" });
        }

        const incident = await Incident.findById(req.params.id)
            .populate('incidentLead', 'email');

        if (!incident) {
            return res.status(404).json({ error: "Incident not found" });
        }

        // Check if user can add updates: admin, incident lead, or assigned to a linked ticket
        const canAddUpdate = canManageIncident(req.user, incident) || 
            await isAssignedToIncidentTicket(req.user._id, incident.tickets);

        if (!canAddUpdate) {
            return res.status(403).json({ error: "Only the incident lead, admin, or assigned employees can add updates" });
        }

        // Add the update
        incident.updates.push({
            userId: req.user._id,
            content: content.trim(),
        });
        await incident.save();

        // Log activity
        await IncidentActivity.create({
            incidentId: incident._id,
            performedBy: req.user._id,
            action: 'UPDATE_ADDED',
            newValue: content.trim().substring(0, 100),
        });

        const updatedIncident = await Incident.findById(req.params.id)
            .populate('department', 'name')
            .populate('incidentLead', 'email role')
            .populate('updates.userId', 'email')
            .populate({
                path: 'tickets',
                populate: [
                    { path: 'createdBy', select: 'email' },
                    { path: 'assignedTo', select: 'email' },
                    { path: 'department', select: 'name' },
                ],
            });

        res.json({ incident: updatedIncident, message: "Update added successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add ticket to incident
export const addTicketToIncident = async (req, res) => {
    try {
        const { ticketId } = req.body;

        if (!ticketId) {
            return res.status(400).json({ error: "Ticket ID is required" });
        }

        const incident = await Incident.findById(req.params.id)
            .populate('incidentLead', 'email');

        if (!incident) {
            return res.status(404).json({ error: "Incident not found" });
        }

        if (!canManageIncident(req.user, incident)) {
            return res.status(403).json({ error: "Only the incident lead or admin can modify tickets" });
        }

        if (incident.status === "resolved") {
            return res.status(400).json({ error: "Cannot modify a resolved incident" });
        }

        // Find the ticket
        const ticket = await Ticket.findById(ticketId).populate('createdBy', 'email');
        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        // Check if ticket is already linked to an incident
        if (ticket.incident) {
            if (ticket.incident.toString() === incident._id.toString()) {
                return res.status(400).json({ error: "Ticket is already linked to this incident" });
            }
            return res.status(400).json({ error: "Ticket is already linked to another incident" });
        }

        // Check if ticket is already resolved
        if (ticket.status === "DONE" || ticket.status === "CLOSED") {
            return res.status(400).json({ error: "Cannot link a resolved or closed ticket" });
        }

        // Link ticket to incident
        incident.tickets.push(ticket._id);
        await incident.save();

        ticket.incident = incident._id;
        await ticket.save();

        const incNumber = `INC-${String(incident.incidentNumber).padStart(3, '0')}`;
        const ticketNumber = `TKT-${String(ticket.ticketNumber).padStart(3, '0')}`;

        // Log ticket activity
        await TicketActivity.create({
            ticketId: ticket._id,
            performedBy: req.user._id,
            action: 'INCIDENT_LINKED',
            newValue: incNumber,
        });

        // Log incident activity
        await IncidentActivity.create({
            incidentId: incident._id,
            performedBy: req.user._id,
            action: 'TICKET_ADDED',
            newValue: ticketNumber,
            metadata: { ticketId: ticket._id },
        });

        // Notify ticket raiser
        if (ticket.createdBy?.email) {
            try {
                await sendMail(
                    ticket.createdBy.email,
                    `Your ticket is now part of Incident ${incNumber}`,
                    `Your ticket ${ticketNumber} has been linked to incident ${incNumber} ("${incident.title}").\n\nOur team is actively investigating. You will be notified when it is resolved.`
                );
            } catch (emailErr) {
                console.error("Failed to email ticket raiser:", emailErr.message);
            }
        }

        const updatedIncident = await Incident.findById(req.params.id)
            .populate('department', 'name')
            .populate('incidentLead', 'email role')
            .populate('updates.userId', 'email')
            .populate({
                path: 'tickets',
                populate: [
                    { path: 'createdBy', select: 'email' },
                    { path: 'assignedTo', select: 'email' },
                    { path: 'department', select: 'name' },
                ],
            });

        res.json({ incident: updatedIncident, message: `Ticket ${ticketNumber} added to incident` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Remove ticket from incident
export const removeTicketFromIncident = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const incident = await Incident.findById(req.params.id)
            .populate('incidentLead', 'email');

        if (!incident) {
            return res.status(404).json({ error: "Incident not found" });
        }

        if (!canManageIncident(req.user, incident)) {
            return res.status(403).json({ error: "Only the incident lead or admin can modify tickets" });
        }

        if (incident.status === "resolved") {
            return res.status(400).json({ error: "Cannot modify a resolved incident" });
        }

        // Check if ticket is in this incident
        const ticketIndex = incident.tickets.findIndex(t => t.toString() === ticketId);
        if (ticketIndex === -1) {
            return res.status(400).json({ error: "Ticket is not linked to this incident" });
        }

        // Must keep at least 1 ticket
        if (incident.tickets.length <= 1) {
            return res.status(400).json({ error: "Cannot remove the last ticket. An incident must have at least one ticket." });
        }

        // Find the ticket
        const ticket = await Ticket.findById(ticketId).populate('createdBy', 'email');
        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        // Remove from incident
        incident.tickets.splice(ticketIndex, 1);
        await incident.save();

        // Unlink ticket
        ticket.incident = null;
        await ticket.save();

        const incNumber = `INC-${String(incident.incidentNumber).padStart(3, '0')}`;
        const ticketNumber = `TKT-${String(ticket.ticketNumber).padStart(3, '0')}`;

        // Log ticket activity
        await TicketActivity.create({
            ticketId: ticket._id,
            performedBy: req.user._id,
            action: 'STATUS_CHANGED',
            oldValue: incNumber,
            newValue: 'Unlinked from incident',
        });

        // Log incident activity
        await IncidentActivity.create({
            incidentId: incident._id,
            performedBy: req.user._id,
            action: 'TICKET_REMOVED',
            oldValue: ticketNumber,
            metadata: { ticketId: ticket._id },
        });

        // Notify ticket raiser
        if (ticket.createdBy?.email) {
            try {
                await sendMail(
                    ticket.createdBy.email,
                    `Your ticket has been removed from Incident ${incNumber}`,
                    `Your ticket ${ticketNumber} has been unlinked from incident ${incNumber}.\n\nYour ticket will continue to be handled separately.`
                );
            } catch (emailErr) {
                console.error("Failed to email ticket raiser:", emailErr.message);
            }
        }

        const updatedIncident = await Incident.findById(req.params.id)
            .populate('department', 'name')
            .populate('incidentLead', 'email role')
            .populate('updates.userId', 'email')
            .populate({
                path: 'tickets',
                populate: [
                    { path: 'createdBy', select: 'email' },
                    { path: 'assignedTo', select: 'email' },
                    { path: 'department', select: 'name' },
                ],
            });

        res.json({ incident: updatedIncident, message: `Ticket ${ticketNumber} removed from incident` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get available tickets (for adding to incident)
export const getAvailableTickets = async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id);
        if (!incident) {
            return res.status(404).json({ error: "Incident not found" });
        }

        // Find tickets that:
        // 1. Are not linked to any incident
        // 2. Are not DONE or CLOSED
        // 3. Belong to the same department (optional, but recommended)
        const tickets = await Ticket.find({
            $or: [{ incident: null }, { incident: { $exists: false } }],
            status: { $in: ["TODO", "IN_PROGRESS"] },
        })
            .populate('createdBy', 'email')
            .populate('department', 'name')
            .select('ticketNumber title status priority department createdBy createdAt')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(tickets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get incident activity log
export const getIncidentActivity = async (req, res) => {
    try {
        const activities = await IncidentActivity.find({ incidentId: req.params.id })
            .populate('performedBy', 'email')
            .sort({ createdAt: -1 });

        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
