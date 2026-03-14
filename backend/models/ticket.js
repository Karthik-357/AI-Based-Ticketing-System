import mongoose from 'mongoose'

const ticketSchema = new mongoose.Schema({
    ticketNumber: { type: Number, unique: true },
    title: String,
    description: String,
    status: { type: String, default: "TODO", enum: ["TODO", "IN_PROGRESS", "DONE", "CLOSED"] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    priority: { type: String, enum: ["low", "medium", "high", "critical"] },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    helpfulNotes: String,
    relatedSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
}, { timestamps: true });

export default mongoose.model("Ticket", ticketSchema)