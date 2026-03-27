import { inngest } from "../inngest/client.js"
import Ticket from "../models/ticket.js"
import User from "../models/user.js"
import Department from "../models/department.js"
import TicketActivity from "../models/ticketActivity.js"
import { getNextSequence } from "../models/counter.js"

const ticketPopulateOpts = [
    { path: 'assignedTo', select: 'email _id department', populate: { path: 'department', select: 'name _id' } },
    { path: 'createdBy', select: 'email _id department', populate: { path: 'department', select: 'name _id' } },
    { path: 'department', select: 'name _id' },
    { path: 'relatedSkills', select: 'name _id' },
    { path: 'incident', select: '_id incidentNumber title status' },
    { path: 'collaborationRequests.user', select: 'email _id department', populate: { path: 'department', select: 'name _id' } },
    { path: 'collaborationRequests.requestedBy', select: 'email _id' },
    { path: 'collaborationRequests.reviewedBy', select: 'email _id' },
    { path: 'collaborators', select: 'email _id department', populate: { path: 'department', select: 'name _id' } }
]

const getDepartmentEmployeeIds = async (department) => {
    const deptId = getIdString(department)
    return User.find({ department: deptId, role: "employee" }).distinct('_id')
}

const getIdString = (value) => {
    if (!value) return null
    if (typeof value === "string") return value
    if (value._id) return value._id.toString()
    return value.toString()
}

const canManagerAccessTicket = async (user, ticket) => {
    const ticketDeptId = getIdString(ticket.department)
    const userDeptId = getIdString(user.department)
    const userId = getIdString(user._id)
    const createdById = getIdString(ticket.createdBy)

    // Manager can always access tickets they created
    if (createdById === userId) {
        return true
    }

    // Manager can access tickets in their department
    if (ticketDeptId === userDeptId) {
        return true
    }

    const deptEmployeeIds = await User.find({
        department: userDeptId,
        role: "employee"
    }).distinct('_id')
    const deptEmployeeIdStrings = deptEmployeeIds.map(id => id.toString())

    // Manager can access tickets assigned to employees in their department
    const assignedToId = getIdString(ticket.assignedTo)
    if (assignedToId && deptEmployeeIdStrings.includes(assignedToId)) {
        return true
    }

    // Manager can access tickets with pending collaboration requests for employees in their department
    const hasPendingRequestForDeptEmployee = (ticket.collaborationRequests || []).some(req =>
        req.status === "pending" && deptEmployeeIdStrings.includes(getIdString(req.user))
    )
    if (hasPendingRequestForDeptEmployee) {
        return true
    }

    // Manager can access tickets where their department employees are approved collaborators
    const hasCollaboratorFromDept = (ticket.collaborators || []).some(c =>
        deptEmployeeIdStrings.includes(getIdString(c))
    )
    if (hasCollaboratorFromDept) {
        return true
    }

    return false
}

const canEmployeeAccessTicket = (user, ticket) => {
    const userId = getIdString(user._id)
    const assignedToId = getIdString(ticket.assignedTo)
    const createdById = getIdString(ticket.createdBy)
    const isApprovedCollaborator = (ticket.collaborators || []).some(id => getIdString(id) === userId)
    return (
        assignedToId === userId ||
        createdById === userId ||
        isApprovedCollaborator
    )
}

const canEmployeeEditTicket = (user, ticket) => {
    const userId = getIdString(user._id)
    const assignedToId = getIdString(ticket.assignedTo)
    const isApprovedCollaborator = (ticket.collaborators || []).some(id => getIdString(id) === userId)
    return assignedToId === userId || isApprovedCollaborator
}

// Accepts ObjectId or department name, returns department id or null.
const resolveDepartment = async (input) => {
    if (!input) return null
    if (input.match?.(/^[0-9a-fA-F]{24}$/)) {
        const dept = await Department.findById(input)
        if (!dept) throw new Error("Department not found")
        return input
    }
    const dept = await Department.findOne({ name: { $regex: new RegExp(`^${input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
    if (!dept) throw new Error(`Department "${input}" does not exist. Please select a valid department.`)
    return dept._id
}

export const createTicket = async (req, res) => {
    try {
        const { title, description, department, category, priority, assignedTo } = req.body
        if (!title || !description) {
            return res.status(400).json({ message: "Title and description are required" })
        }

        const deptInput = department || category
        let departmentId
        try {
            departmentId = await resolveDepartment(deptInput)
        } catch (err) {
            return res.status(400).json({ message: err.message })
        }

        if (!departmentId) {
            return res.status(400).json({ message: "A valid department is required to create a ticket." })
        }

        // Validate assignedTo if provided (manual assignment mode)
        let validatedAssignee = null
        if (assignedTo) {
            const assignee = await User.findById(assignedTo)
            if (!assignee) {
                return res.status(400).json({ message: "Selected assignee not found" })
            }
            if (assignee.role !== "employee") {
                return res.status(400).json({ message: "Tickets can only be assigned to employees" })
            }
            // Ensure assignee belongs to the selected department
            const assigneeDeptId = assignee.department?.toString() || assignee.department
            if (assigneeDeptId !== departmentId.toString()) {
                return res.status(400).json({ message: "Assignee must belong to the selected department" })
            }
            validatedAssignee = assignee._id
        }

        const ticketNumber = await getNextSequence("ticketNumber")
        const ticketData = {
            ticketNumber,
            title,
            description,
            department: departmentId,
            priority,
            createdBy: req.user._id.toString()
        }

        // If manual assignment, set assignedTo and status
        if (validatedAssignee) {
            ticketData.assignedTo = validatedAssignee
            ticketData.status = "IN_PROGRESS"
        }

        const newTicket = await Ticket.create(ticketData)

        await TicketActivity.create({
            ticketId: newTicket._id,
            performedBy: req.user._id,
            action: 'CREATED'
        })

        // Log manual assignment activity if applicable
        if (validatedAssignee) {
            const assignee = await User.findById(validatedAssignee)
            await TicketActivity.create({
                ticketId: newTicket._id,
                performedBy: req.user._id,
                action: 'ASSIGNED',
                newValue: assignee.email
            })
        }

        await inngest.send(({
            name: "ticket/created",
            data: {
                ticketId: newTicket._id.toString(),
                title,
                description,
                createdBy: req.user._id.toString(),
                isManualAssignment: !!validatedAssignee
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

        // Raised view is always only tickets created by current user.
        if (view === "raised") {
            tickets = await Ticket.find({ createdBy: user._id })
                .populate(ticketPopulateOpts)
                .sort({ createdAt: -1 })
            return res.status(200).json(tickets)
        }

        // Assigned view — tickets personally assigned to the current user (any role).
        if (view === "assigned") {
            tickets = await Ticket.find({ assignedTo: user._id })
                .populate(ticketPopulateOpts)
                .sort({ createdAt: -1 })
            return res.status(200).json(tickets)
        }

        // Collaborating view — tickets where user is an approved collaborator.
        if (view === "collaborating") {
            tickets = await Ticket.find({ collaborators: user._id })
                .populate(ticketPopulateOpts)
                .sort({ createdAt: -1 })
            return res.status(200).json(tickets)
        }

        // All tickets view — admin only oversight.
        if (view === "all") {
            if (user.role !== "admin") {
                return res.status(403).json({ message: "Access denied" })
            }
            tickets = await Ticket.find({})
                .populate(ticketPopulateOpts)
                .sort({ createdAt: -1 })
            return res.status(200).json(tickets)
        }

        // Department view — manager can see all tickets for their department/team.
        if (view === "department") {
            if (user.role !== "manager") {
                return res.status(403).json({ message: "Access denied" })
            }

            const userDeptId = getIdString(user.department)
            const departmentEmployees = await User.find({
                department: userDeptId,
                role: "employee"
            }).distinct('_id');

            tickets = await Ticket.find({
                $or: [
                    { department: userDeptId },
                    { assignedTo: { $in: departmentEmployees } },
                    { collaborators: { $in: departmentEmployees } }
                ]
            })
                .populate(ticketPopulateOpts)
                .sort({ createdAt: -1 })
            return res.status(200).json(tickets)
        }

        if (view === "collab_pending") {
            if (user.role !== "manager" && user.role !== "admin") {
                return res.status(403).json({ message: "Access denied. Only managers and admins can view pending approvals." })
            }

            if (user.role === "manager") {
                if (!user.department) {
                    return res.status(400).json({ message: "Manager account has no department assigned" })
                }
                const deptEmployeeIds = await getDepartmentEmployeeIds(user.department)
                tickets = await Ticket.find({
                    "collaborationRequests": {
                        $elemMatch: {
                            user: { $in: deptEmployeeIds },
                            status: "pending"
                        }
                    }
                })
                    .populate(ticketPopulateOpts)
                    .sort({ createdAt: -1 })
                return res.status(200).json(tickets)
            }

            if (user.role === "admin") {
                tickets = await Ticket.find({
                    "collaborationRequests.status": "pending"
                })
                    .populate(ticketPopulateOpts)
                    .sort({ createdAt: -1 })
                return res.status(200).json(tickets)
            }
        }

        // Assigned view — tickets personally assigned to the current user.
        if (user.role === "admin") {
            tickets = await Ticket.find({ assignedTo: user._id })
                .populate(ticketPopulateOpts)
                .sort({ createdAt: -1 })
        } else if (user.role === "manager") {
            const managerDeptId = getIdString(user.department)
            const departmentEmployees = await User.find({
                department: managerDeptId,
                role: "employee"
            }).distinct('_id');

            tickets = await Ticket.find({
                $or: [
                    { department: managerDeptId },
                    { assignedTo: { $in: departmentEmployees } },
                    { collaborators: { $in: departmentEmployees } }
                ]
            })
                .populate(ticketPopulateOpts)
                .sort({ createdAt: -1 })
        } else if (user.role === "employee") {
            tickets = await Ticket.find({ assignedTo: user._id })
                .populate(ticketPopulateOpts)
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
        const ticket = await Ticket.findById(req.params.id).populate(ticketPopulateOpts)

        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" })
        }

        if (user.role === "manager") {
            const canAccess = await canManagerAccessTicket(user, ticket)
            if (!canAccess) return res.status(403).json({ message: "Access denied" })
        } else if (user.role === "employee" && !canEmployeeAccessTicket(user, ticket)) {
            return res.status(403).json({ message: "Access denied" })
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
            const canAccess = await canManagerAccessTicket(user, ticket)
            if (!canAccess) {
                return res.status(403).json({ message: "Access denied. You can only manage tickets in your department or assigned to your team." });
            }
        }

        // Employee can update only if this ticket is assigned to them or approved as collaborator.
        if (user.role === "employee" && !canEmployeeEditTicket(user, ticket)) {
            return res.status(403).json({ message: "Access denied. You can only update tickets assigned to you." });
        }

        if (status && !["TODO", "IN_PROGRESS", "DONE", "CLOSED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Allowed values: TODO, IN_PROGRESS, DONE, CLOSED" });
        }

        if (priority && !["low", "medium", "high", "critical"].includes(priority)) {
            return res.status(400).json({ message: "Invalid priority. Allowed values: low, medium, high, critical" })
        }

        if (ticket.status === "CLOSED") {
            const isReopenOnly = status === "IN_PROGRESS" && priority === undefined && assignedTo === undefined
            const canReopen = user.role === "admin" || user.role === "manager"
            if (!canReopen || !isReopenOnly) {
                return res.status(400).json({ message: "Closed tickets are read-only. Only manager/admin can reopen to IN_PROGRESS." })
            }
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
            if (status === "CLOSED") {
                ticket.collaborationRequests = [];
                ticket.collaborators = [];
            }
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

        // Only manager/admin can assign or reassign. Empty string unassigns.
        if ((user.role === "manager" || user.role === "admin") && assignedTo !== undefined) {
            const normalizedAssignedTo = assignedTo || null
            if ((ticket.assignedTo?.toString() || null) !== normalizedAssignedTo) {
                const isReassign = ticket.assignedTo != null;
                await TicketActivity.create({
                    ticketId: ticket._id,
                    performedBy: user._id,
                    action: isReassign ? 'REASSIGNED' : 'ASSIGNED',
                    oldValue: ticket.assignedTo?.toString() || null,
                    newValue: normalizedAssignedTo
                });
                ticket.assignedTo = normalizedAssignedTo;
            }
        }

        await ticket.save();

        const updatedTicket = await Ticket.findById(ticketId).populate(ticketPopulateOpts);
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
        const user = req.user
        const ticket = await Ticket.findById(req.params.id)
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" })
        }

        if (user.role === "manager") {
            const canAccess = await canManagerAccessTicket(user, ticket)
            if (!canAccess) {
                return res.status(403).json({ message: "Access denied" })
            }
        } else if (user.role === "employee" && !canEmployeeAccessTicket(user, ticket)) {
            return res.status(403).json({ message: "Access denied" })
        }

        const activities = await TicketActivity.find({ ticketId: req.params.id })
            .populate('performedBy', 'email role')
            .sort({ createdAt: -1 });
        return res.json(activities);
    } catch (error) {
        console.error("Error fetching activities:", error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const requestCollaboration = async (req, res) => {
    try {
        const { reason, collaboratorIds } = req.body
        const user = req.user
        const ticket = await Ticket.findById(req.params.id)
        if (!ticket) return res.status(404).json({ message: "Ticket not found" })

        if (ticket.status === "CLOSED") {
            return res.status(400).json({ message: "Cannot request collaboration on a closed ticket" })
        }

        // Only the assignee can request collaborators
        const isAssignee = getIdString(ticket.assignedTo) === getIdString(user._id)
        if (user.role === "employee" && !isAssignee) {
            return res.status(403).json({ message: "Only the assignee can request collaborators" })
        }

        if (!reason || !reason.trim()) {
            return res.status(400).json({ message: "Collaboration reason is required" })
        }

        if (!Array.isArray(collaboratorIds) || collaboratorIds.length === 0) {
            return res.status(400).json({ message: "At least one collaborator must be specified" })
        }

        const uniqueCollaboratorIds = [...new Set(collaboratorIds)]

        const users = await User.find({ _id: { $in: uniqueCollaboratorIds } })
        if (users.length !== uniqueCollaboratorIds.length) {
            return res.status(400).json({ message: "One or more collaborators are invalid" })
        }

        const invalidRole = users.find(u => u.role !== "employee")
        if (invalidRole) {
            return res.status(400).json({ message: "Only employees can be requested as collaborators" })
        }

        const assigneeId = ticket.assignedTo?.toString()
        if (uniqueCollaboratorIds.includes(assigneeId)) {
            return res.status(400).json({ message: "Cannot request the assignee as a collaborator" })
        }

        const alreadyCollaborator = uniqueCollaboratorIds.find(id =>
            (ticket.collaborators || []).some(c => getIdString(c) === id)
        )
        if (alreadyCollaborator) {
            return res.status(400).json({ message: "One or more users are already collaborators" })
        }

        const pendingIds = (ticket.collaborationRequests || [])
            .filter(r => r.status === "pending")
            .map(r => getIdString(r.user))
        const alreadyPending = uniqueCollaboratorIds.find(id => pendingIds.includes(id))
        if (alreadyPending) {
            return res.status(400).json({ message: "One or more users already have a pending request" })
        }

        const newRequests = uniqueCollaboratorIds.map(userId => ({
            user: userId,
            requestedBy: user._id,
            requestedAt: new Date(),
            reason: reason.trim(),
            status: "pending"
        }))

        ticket.collaborationRequests.push(...newRequests)
        await ticket.save()

        await TicketActivity.create({
            ticketId: ticket._id,
            performedBy: user._id,
            action: 'COLLAB_REQUESTED',
            newValue: `${uniqueCollaboratorIds.length} collaborator(s) requested`
        })

        const updatedTicket = await Ticket.findById(ticket._id).populate(ticketPopulateOpts)
        return res.status(200).json({ message: "Collaboration request submitted", ticket: updatedTicket })
    } catch (error) {
        console.error("Error requesting collaboration", error.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const reviewCollaboration = async (req, res) => {
    try {
        const { decision, requestIds, comment = "" } = req.body
        const user = req.user
        const ticket = await Ticket.findById(req.params.id).populate('collaborationRequests.user', 'department')
        if (!ticket) return res.status(404).json({ message: "Ticket not found" })

        if (user.role !== "admin" && user.role !== "manager") {
            return res.status(403).json({ message: "Only manager/admin can review collaboration requests" })
        }

        if (ticket.status === "CLOSED") {
            return res.status(400).json({ message: "Cannot review collaboration on a closed ticket" })
        }

        if (!["approve", "reject"].includes(decision)) {
            return res.status(400).json({ message: "Decision must be approve or reject" })
        }

        if (!Array.isArray(requestIds) || requestIds.length === 0) {
            return res.status(400).json({ message: "At least one request ID is required" })
        }

        if (decision === "reject" && !comment?.trim()) {
            return res.status(400).json({ message: "Rejection comment is required" })
        }

        const pendingRequests = ticket.collaborationRequests.filter(r =>
            r.status === "pending" && requestIds.includes(r._id.toString())
        )

        if (pendingRequests.length === 0) {
            return res.status(400).json({ message: "No valid pending requests found for the given IDs" })
        }

        if (user.role === "manager") {
            const managerDeptId = user.department?._id?.toString() || user.department?.toString()
            const unauthorized = pendingRequests.find(r => {
                const collabDept = r.user?.department?._id?.toString() || r.user?.department?.toString()
                return collabDept !== managerDeptId
            })
            if (unauthorized) {
                return res.status(403).json({ message: "You can only review requests for employees in your department" })
            }
        }

        const ticketDeptId = ticket.department?._id?.toString() || ticket.department?.toString()
        const reviewerDeptId = user.department?._id?.toString() || user.department?.toString()
        const isCrossDepartment = user.role === "manager" && ticketDeptId !== reviewerDeptId

        for (const req of pendingRequests) {
            const idx = ticket.collaborationRequests.findIndex(r => r._id.toString() === req._id.toString())
            if (idx === -1) continue

            ticket.collaborationRequests[idx].status = decision === "approve" ? "approved" : "rejected"
            ticket.collaborationRequests[idx].reviewedBy = user._id
            ticket.collaborationRequests[idx].reviewedAt = new Date()
            ticket.collaborationRequests[idx].reviewComment = comment?.trim() || null

            if (decision === "approve") {
                const collaboratorId = getIdString(req.user._id || req.user)
                if (!ticket.collaborators.some(c => getIdString(c) === collaboratorId)) {
                    ticket.collaborators.push(collaboratorId)
                }

                await TicketActivity.create({
                    ticketId: ticket._id,
                    performedBy: user._id,
                    action: 'COLLAB_APPROVED',
                    newValue: collaboratorId,
                    oldValue: isCrossDepartment ? "cross-department" : null
                })
            } else {
                await TicketActivity.create({
                    ticketId: ticket._id,
                    performedBy: user._id,
                    action: 'COLLAB_REJECTED',
                    newValue: getIdString(req.user._id || req.user),
                    oldValue: comment?.trim().substring(0, 120)
                })
            }
        }

        await ticket.save()

        const updatedTicket = await Ticket.findById(ticket._id).populate(ticketPopulateOpts)
        const actionWord = decision === "approve" ? "approved" : "rejected"
        return res.status(200).json({
            message: `${pendingRequests.length} collaboration request(s) ${actionWord}`,
            ticket: updatedTicket,
            crossDepartment: isCrossDepartment
        })
    } catch (error) {
        console.error("Error reviewing collaboration", error.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}
