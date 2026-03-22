import mongoose from 'mongoose'

const ticketSchema = new mongoose.Schema({
    ticketNumber: { type: Number, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, default: "TODO", enum: ["TODO", "IN_PROGRESS", "DONE", "CLOSED"] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    priority: { type: String, enum: ["low", "medium", "high", "critical"] },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    helpfulNotes: String,
    relatedSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null },
    collaborationRequests: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        requestedAt: { type: Date, default: Date.now },
        reason: { type: String, required: true },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        reviewComment: { type: String, default: null }
    }],
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model("Ticket", ticketSchema)
