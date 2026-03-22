import mongoose from 'mongoose'

const incidentUpdateSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const incidentSchema = new mongoose.Schema({
    incidentNumber: { type: Number, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: {
        type: String,
        default: "P3",
        enum: ["P1", "P2", "P3", "P4"]
    },
    status: {
        type: String,
        default: "investigating",
        enum: ["investigating", "identified", "monitoring", "resolved"]
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    incidentLead: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' }],
    updates: [incidentUpdateSchema],
    rootCause: { type: String, default: null },
    resolutionSummary: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model("Incident", incidentSchema)
