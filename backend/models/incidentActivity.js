import mongoose from 'mongoose'

const incidentActivitySchema = new mongoose.Schema({
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
        type: String,
        required: true,
        enum: [
            'CREATED',
            'STATUS_CHANGED',
            'PRIORITY_CHANGED',
            'UPDATE_ADDED',
            'TICKET_ADDED',
            'TICKET_REMOVED',
            'RESOLVED'
        ]
    },
    oldValue: { type: String, default: null },
    newValue: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("IncidentActivity", incidentActivitySchema)
