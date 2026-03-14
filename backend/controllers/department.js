import Department from "../models/department.js"

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
        return res.status(201).json({ message: "Department created", department });
    } catch (error) {
        res.status(500).json({ error: "Failed to create department", details: error.message });
    }
};

export const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, managerId } = req.body;

        const department = await Department.findByIdAndUpdate(
            id,
            { name, description, managerId },
            { new: true, runValidators: true }
        );
        if (!department) return res.status(404).json({ error: "Department not found" });

        return res.json({ message: "Department updated", department });
    } catch (error) {
        res.status(500).json({ error: "Failed to update department", details: error.message });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const department = await Department.findByIdAndDelete(id);
        if (!department) return res.status(404).json({ error: "Department not found" });

        return res.json({ message: "Department deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete department", details: error.message });
    }
};
