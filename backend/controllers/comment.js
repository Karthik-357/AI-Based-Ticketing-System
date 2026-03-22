import Comment from '../models/comment.js';
import Ticket from '../models/ticket.js';
import TicketActivity from '../models/ticketActivity.js';
import {
    canEmployeeAccessTicket,
    canManagerAccessTicket
} from '../utils/ticketHelpers.js';

export const addComment = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        if (req.user.role === "manager") {
            const canAccess = await canManagerAccessTicket(req.user, ticket)
            if (!canAccess) return res.status(403).json({ message: "Access denied" })
        } else if (req.user.role === "employee" && !canEmployeeAccessTicket(req.user, ticket)) {
            return res.status(403).json({ message: "Access denied" })
        }

        const newComment = await Comment.create({
            ticketId,
            userId,
            content
        });

        await TicketActivity.create({
            ticketId,
            performedBy: userId,
            action: 'COMMENT_ADDED'
        });

        const populatedComment = await Comment.findById(newComment._id).populate('userId', 'email role');

        return res.status(201).json({
            message: "Comment added successfully",
            comment: populatedComment
        });

    } catch (error) {
        console.error("Error adding comment:", error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getComments = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        if (req.user.role === "manager") {
            const canAccess = await canManagerAccessTicket(req.user, ticket)
            if (!canAccess) return res.status(403).json({ message: "Access denied" })
        } else if (req.user.role === "employee" && !canEmployeeAccessTicket(req.user, ticket)) {
            return res.status(403).json({ message: "Access denied" })
        }

        const comments = await Comment.find({ ticketId })
            .populate('userId', 'email role')
            .sort({ createdAt: 1 });

        return res.status(200).json(comments);

    } catch (error) {
        console.error("Error fetching comments:", error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};
