import mongoose from 'mongoose'

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Department", departmentSchema)
