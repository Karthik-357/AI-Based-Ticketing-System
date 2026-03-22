import Department from "../models/department.js"
import User from "../models/user.js"
import Ticket from "../models/ticket.js"

export const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find().populate("managerId", "email _id");
        return res.json(departments);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch departments", details: error.message });
    }
};

export const createDepartment = async (req, res) => {
    try {
        const { name, description, managerId } = req.body;
        if (!name) return res.status(400).json({ error: "Department name is required" });

        const existing = await Department.findOne({ name });
        if (existing) return res.status(400).json({ error: "Department already exists" });

        const department = await Department.create({ name, description, managerId: managerId || null });

        // Auto-sync: if a manager is assigned, update that user's department and ensure role is manager
        if (managerId) {
            await User.findByIdAndUpdate(managerId, {
                department: department._id,
                role: 'manager'
            });
            console.log(`[Dept Sync] Updated user ${managerId} department to ${department._id}`);
        }

        return res.status(201).json({ message: "Department created", department });
    } catch (error) {
        res.status(500).json({ error: "Failed to create department", details: error.message });
    }
};

export const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, managerId } = req.body;

        const existingDept = await Department.findById(id);
        if (!existingDept) return res.status(404).json({ error: "Department not found" });

        const oldManagerId = existingDept.managerId?.toString() || null;
        const newManagerId = managerId || null;

        const department = await Department.findByIdAndUpdate(
            id,
            { name, description, managerId: newManagerId },
            { new: true, runValidators: true }
        );

        // Sync managers if managerId changed
        if (oldManagerId !== (newManagerId?.toString() || null)) {
            // Clear old manager's department link (only if they pointed to this dept)
            if (oldManagerId) {
                const oldManager = await User.findById(oldManagerId);
                if (oldManager && oldManager.department?.toString() === id) {
                    oldManager.department = null;
                    await oldManager.save();
                    console.log(`[Dept Sync] Cleared department from old manager ${oldManagerId}`);
                }
            }
            // Set new manager's department and ensure role is manager
            if (newManagerId) {
                await User.findByIdAndUpdate(newManagerId, {
                    department: department._id,
                    role: 'manager'
                });
                console.log(`[Dept Sync] Updated user ${newManagerId} department to ${department._id}`);
            }
        }

        return res.json({ message: "Department updated", department });
    } catch (error) {
        res.status(500).json({ error: "Failed to update department", details: error.message });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const department = await Department.findById(id);
        if (!department) return res.status(404).json({ error: "Department not found" });

        // Nullify department reference on all users assigned to this department
        const usersUpdated = await User.updateMany(
            { department: id },
            { department: null }
        );
        console.log(`[Dept Delete] Cleared department from ${usersUpdated.modifiedCount} users`);

        // Nullify department reference on all tickets assigned to this department
        const ticketsUpdated = await Ticket.updateMany(
            { department: id },
            { department: null }
        );
        console.log(`[Dept Delete] Cleared department from ${ticketsUpdated.modifiedCount} tickets`);

        await Department.findByIdAndDelete(id);

        return res.json({ message: "Department deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete department", details: error.message });
    }
};
