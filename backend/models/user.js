import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "employee", enum: ["admin", "manager", "employee"] },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema)