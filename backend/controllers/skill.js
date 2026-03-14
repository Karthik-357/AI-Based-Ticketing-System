import Skill from "../models/skill.js"

export const getSkills = async (req, res) => {
    try {
        const { department } = req.query;
        const filter = department ? { department } : {};
        const skills = await Skill.find(filter).populate("department", "name _id");
        return res.json(skills);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch skills", details: error.message });
    }
};

export const createSkill = async (req, res) => {
    try {
        const { name, department } = req.body;
        if (!name) return res.status(400).json({ error: "Skill name is required" });

        const existing = await Skill.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) return res.status(400).json({ error: "Skill already exists" });

        const skill = await Skill.create({ name, department: department || null });
        const populated = await Skill.findById(skill._id).populate("department", "name _id");
        return res.status(201).json({ message: "Skill created", skill: populated });
    } catch (error) {
        res.status(500).json({ error: "Failed to create skill", details: error.message });
    }
};

export const deleteSkill = async (req, res) => {
    try {
        const { id } = req.params;
        const skill = await Skill.findByIdAndDelete(id);
        if (!skill) return res.status(404).json({ error: "Skill not found" });

        return res.json({ message: "Skill deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete skill", details: error.message });
    }
};
