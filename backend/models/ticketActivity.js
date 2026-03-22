import mongoose from 'mongoose'

const ticketActivitySchema = new mongoose.Schema({
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
        type: String,
        required: true,
        enum: ['CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'REASSIGNED', 'PRIORITY_CHANGED', 'COMMENT_ADDED', 'INCIDENT_LINKED', 'INCIDENT_RESOLVED', 'COLLAB_REQUESTED', 'COLLAB_APPROVED', 'COLLAB_REJECTED']
    },
    oldValue: { type: String, default: null },
    newValue: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("TicketActivity", ticketActivitySchema)
