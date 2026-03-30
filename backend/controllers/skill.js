import Skill from "../models/skill.js"
import User from "../models/user.js"
import Ticket from "../models/ticket.js"

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

        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existing = await Skill.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
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
        const skill = await Skill.findById(id);
        if (!skill) return res.status(404).json({ error: "Skill not found" });

        // Clean up all references to this skill before deletion

        // 1. Remove from all users' skills arrays
        await User.updateMany({ skills: id }, { $pull: { skills: id } });

        // 2. Remove from all tickets' relatedSkills arrays
        await Ticket.updateMany({ relatedSkills: id }, { $pull: { relatedSkills: id } });

        await Skill.findByIdAndDelete(id);
        return res.json({ message: "Skill deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete skill", details: error.message });
    }
};
