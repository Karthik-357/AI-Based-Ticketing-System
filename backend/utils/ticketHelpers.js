import User from "../models/user.js";

const getIdString = (value) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (value._id) return value._id.toString();
    return value.toString();
};

export const canEmployeeAccessTicket = (user, ticket) => {
    const userId = getIdString(user._id);
    const assignedToId = getIdString(ticket.assignedTo);
    const createdById = getIdString(ticket.createdBy);
    const isApprovedCollaborator = (ticket.collaborators || []).some(id => getIdString(id) === userId);
    return (
        assignedToId === userId ||
        createdById === userId ||
        isApprovedCollaborator
    );
};

export const canManagerAccessTicket = async (user, ticket) => {
    const ticketDeptId = getIdString(ticket.department);
    const userDeptId = getIdString(user.department);

    // Manager can access tickets in their department
    if (ticketDeptId === userDeptId) {
        return true;
    }

    const deptEmployeeIds = await User.find({
        department: userDeptId,
        role: "employee"
    }).distinct('_id');
    const deptEmployeeIdStrings = deptEmployeeIds.map(id => id.toString());

    // Manager can access tickets assigned to employees in their department
    const assignedToId = getIdString(ticket.assignedTo);
    if (assignedToId && deptEmployeeIdStrings.includes(assignedToId)) {
        return true;
    }

    // Manager can access tickets with pending collaboration requests for employees in their department
    const hasPendingRequestForDeptEmployee = (ticket.collaborationRequests || []).some(req =>
        req.status === "pending" && deptEmployeeIdStrings.includes(getIdString(req.user))
    );
    if (hasPendingRequestForDeptEmployee) {
        return true;
    }

    return false;
};
