import mongoose from 'mongoose'

const skillSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Skill", skillSchema)
