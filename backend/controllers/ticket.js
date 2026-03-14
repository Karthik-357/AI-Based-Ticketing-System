import { inngest } from "../inngest/client.js"
import Ticket from "../models/ticket.js"
import User from "../models/user.js"
import Department from "../models/department.js"
import TicketActivity from "../models/ticketActivity.js"
import { getNextSequence } from "../models/counter.js"

// Accepts ObjectId or department name, creates department if missing.
const resolveDepartment = async (input) => {
    if (!input) return null
    if (input.match?.(/^[0-9a-fA-F]{24}$/)) return input
    let dept = await Department.findOne({ name: { $regex: new RegExp(`^${input}$`, 'i') } })
    if (!dept) dept = await Department.create({ name: input })
    return dept._id
}

export const createTicket = async (req, res) => {
    try {
        const { title, description, department, category, priority } = req.body
        if (!title || !description) {
            return res.status(400).json({ message: "Title and description are required" })
        }

        const deptInput = department || category
        const departmentId = await resolveDepartment(deptInput)

        const ticketNumber = await getNextSequence("ticketNumber")
        const newTicket = await Ticket.create({
            ticketNumber,
            title,
            description,
            department: departmentId,
            priority,
            createdBy: req.user._id.toString()
        })

        await TicketActivity.create({
            ticketId: newTicket._id,
            performedBy: req.user._id,
            action: 'CREATED'
        })

        await inngest.send(({
            name: "ticket/created",
            data: {
                ticketId: newTicket._id.toString(),
                title,
                description,
                createdBy: req.user._id.toString()
            }
        }));
        return res.status(201).json({
            message: "Ticket created and processing started",
            ticket: newTicket
        })

    } catch (error) {
        console.error("Error creating ticket", error.message)
        return res.status(500).json({ message: "Internal server error" })
    }
};

export const getTickets = async (req, res) => {
    try {
        const user = req.user
        const view = req.query.view
        let tickets = []

        const populateOpts = [
            { path: 'assignedTo', select: 'email _id' },
            { path: 'createdBy', select: 'email _id department', populate: { path: 'department', select: 'name _id' } },
            { path: 'department', select: 'name _id' },
            { path: 'relatedSkills', select: 'name _id' }
        ]

        // Raised view is always only tickets created by current user.
        if (view === "raised") {
            tickets = await Ticket.find({ createdBy: user._id })
                .populate(populateOpts)
                .sort({ createdAt: -1 })
            return res.status(200).json(tickets)
        }

        // All tickets view — admin only oversight.
        if (view === "all") {
            if (user.role !== "admin") {
                return res.status(403).json({ message: "Access denied" })
            }
            tickets = await Ticket.find({})
                .populate(populateOpts)
                .sort({ createdAt: -1 })
            return res.status(200).json(tickets)
        }

        // Assigned view — tickets personally assigned to the current user.
        if (user.role === "admin") {
            tickets = await Ticket.find({ assignedTo: user._id })
                .populate(populateOpts)
                .sort({ createdAt: -1 })
        } else if (user.role === "manager") {
            const departmentEmployees = await User.find({
                department: user.department,
                role: "employee"
            }).distinct('_id');

            tickets = await Ticket.find({
                $or: [
                    { department: user.department },
                    { assignedTo: { $in: departmentEmployees } }
                ]
            })
                .populate(populateOpts)
                .sort({ createdAt: -1 })
        } else if (user.role === "employee") {
            tickets = await Ticket.find({ assignedTo: user._id })
                .populate(populateOpts)
                .sort({ createdAt: -1 })
        }
        return res.status(200).json(tickets)
    } catch (error) {
        console.error("Error fetching ticket", error.message)
        return res.status(500).json({ message: "Internal server error" })
    }
};

export const getTicket = async (req, res) => {
    try {
        const user = req.user
        let ticket;

        const populateOpts = [
            { path: 'assignedTo', select: 'email _id' },
            { path: 'createdBy', select: 'email _id department', populate: { path: 'department', select: 'name _id' } },
            { path: 'department', select: 'name _id' },
            { path: 'relatedSkills', select: 'name _id' }
        ]

        // Role-based access for single ticket details.
        if (user.role === "admin") {
            ticket = await Ticket.findById(req.params.id).populate(populateOpts)
        } else if (user.role === "manager") {
            const departmentEmployees = await User.find({
                department: user.department,
                role: "employee"
            }).distinct('_id');

            ticket = await Ticket.findOne({
                _id: req.params.id,
                $or: [
                    { createdBy: user._id },
                    { department: user.department },
                    { assignedTo: { $in: departmentEmployees } }
                ]
            }).populate(populateOpts)
        } else if (user.role === "employee") {
            ticket = await Ticket.findOne({
                _id: req.params.id,
                $or: [
                    { assignedTo: user._id },
                    { createdBy: user._id }
                ]
            }).populate(populateOpts)
        }

        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" })
        }
        return res.status(200).json({ ticket })
    } catch (error) {
        console.error("Error fetching ticket", error.message)
        return res.status(500).json({ message: "Internal server error" })
    }
};

export const updateTicket = async (req, res) => {
    try {
        const user = req.user;
        const ticketId = req.params.id;
        const { status, priority, assignedTo } = req.body;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        // Manager can update own department or their team tickets.
        if (user.role === "manager") {
            const departmentEmployees = await User.find({
                department: user.department,
                role: "employee"
            }).distinct('_id');

            const isAssignedToEmployee = ticket.assignedTo && departmentEmployees.some(id => id.toString() === ticket.assignedTo.toString());

            if (ticket.department?.toString() !== user.department?.toString() && !isAssignedToEmployee) {
                return res.status(403).json({ message: "Access denied. You can only manage tickets in your department or assigned to your team." });
            }
        }

        // Employee can update only if this ticket is assigned to them.
        if (user.role === "employee" && ticket.assignedTo?.toString() !== user._id.toString()) {
            return res.status(403).json({ message: "Access denied. You can only update tickets assigned to you." });
        }

        if (status && !["TODO", "IN_PROGRESS", "DONE", "CLOSED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Allowed values: TODO, IN_PROGRESS, DONE, CLOSED" });
        }

        if (priority && !["low", "medium", "high", "critical"].includes(priority)) {
            return res.status(400).json({ message: "Invalid priority. Allowed values: low, medium, high, critical" })
        }

        if (status && status !== ticket.status) {
            await TicketActivity.create({
                ticketId: ticket._id,
                performedBy: user._id,
                action: 'STATUS_CHANGED',
                oldValue: ticket.status,
                newValue: status
            });
            ticket.status = status;
        }

        if (priority && priority !== ticket.priority) {
            await TicketActivity.create({
                ticketId: ticket._id,
                performedBy: user._id,
                action: 'PRIORITY_CHANGED',
                oldValue: ticket.priority || 'none',
                newValue: priority
            });
            ticket.priority = priority;
        }

        // Only manager/admin can assign or reassign.
        if (assignedTo && (user.role === "manager" || user.role === "admin")) {
            const isReassign = ticket.assignedTo != null;
            await TicketActivity.create({
                ticketId: ticket._id,
                performedBy: user._id,
                action: isReassign ? 'REASSIGNED' : 'ASSIGNED',
                oldValue: ticket.assignedTo?.toString() || null,
                newValue: assignedTo
            });
            ticket.assignedTo = assignedTo;
        }

        await ticket.save();

        const populateOpts = [
            { path: 'assignedTo', select: 'email _id' },
            { path: 'department', select: 'name _id' },
            { path: 'relatedSkills', select: 'name _id' }
        ]
        const updatedTicket = await Ticket.findById(ticketId).populate(populateOpts);
        return res.status(200).json({
            message: "Ticket updated successfully",
            ticket: updatedTicket
        });
    } catch (error) {
        console.error("Error updating ticket", error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getTicketActivities = async (req, res) => {
    try {
        const activities = await TicketActivity.find({ ticketId: req.params.id })
            .populate('performedBy', 'email role')
            .sort({ createdAt: -1 });
        return res.json(activities);
    } catch (error) {
        console.error("Error fetching activities:", error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};