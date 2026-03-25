import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import User from "../models/user.js"
import Department from "../models/department.js"
import Skill from "../models/skill.js"

// Department can come as id or name from admin forms.
const resolveDepartment = async (deptInput) => {
    if (!deptInput) return null
    if (deptInput.match?.(/^[0-9a-fA-F]{24}$/)) {
        const dept = await Department.findById(deptInput)
        if (!dept) throw new Error("Department not found")
        return deptInput
    }
    const dept = await Department.findOne({ name: { $regex: new RegExp(`^${deptInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
    if (!dept) throw new Error(`Department "${deptInput}" does not exist. Please create it first.`)
    return dept._id
}

// Escape regex special characters in a string
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Skills can come as ids or names; names are created if not present.
const resolveSkills = async (skillsInput, departmentId = null) => {
    if (!skillsInput || !Array.isArray(skillsInput) || skillsInput.length === 0) return []
    if (skillsInput[0].match?.(/^[0-9a-fA-F]{24}$/)) return skillsInput
    const skillIds = []
    for (const name of skillsInput) {
        const trimmed = name.trim()
        if (!trimmed) continue
        // Escape special regex characters for safe case-insensitive search
        const escapedName = escapeRegex(trimmed)
        let skill = await Skill.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } })
        if (!skill) {
            try {
                skill = await Skill.create({ name: trimmed, department: departmentId })
            } catch (err) {
                // Handle duplicate key error (skill may exist with different casing)
                if (err.code === 11000) {
                    skill = await Skill.findOne({ name: trimmed })
                    if (!skill) throw err
                } else {
                    throw err
                }
            }
        } else if (!skill.department && departmentId) {
            // Keep existing skill linked to selected department if empty.
            skill.department = departmentId
            await skill.save()
        }
        skillIds.push(skill._id)
    }
    return skillIds
}

export const addUser = async (req, res) => {
    const { email, password, role, department, skills = [] } = req.body
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "User already exists" });

        let departmentId
        try {
            departmentId = await resolveDepartment(department)
        } catch (err) {
            return res.status(400).json({ error: err.message })
        }
        const skillIds = await resolveSkills(skills, departmentId)

        const hashed = await bcrypt.hash(password, 10)
        const user = await User.create({
            email,
            password: hashed,
            role: role || 'employee',
            department: departmentId,
            skills: skillIds
        })

        const populatedUser = await User.findById(user._id)
            .select('-password')
            .populate('department', 'name _id')
            .populate('skills', 'name _id');

        res.json({ message: "User created successfully", user: populatedUser });

    } catch (error) {
        console.error("Add User error:", error)
        res.status(500).json({
            error: "Failed to add user",
            details: error.message
        });
    }
};


export const login = async (req, res) => {
    const { email, password } = req.body

    try {
        const user = await User.findOne({ email })
        if (!user) return res.status(401).json({ error: "User not found" })

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" })
        }

        const token = jwt.sign(
            { _id: user._id, role: user.role }, process.env.JWT_SECRET);

        const populatedUser = await User.findById(user._id)
            .select('-password')
            .populate('department', 'name _id')
            .populate('skills', 'name _id');

        res.json({
            user: {
                _id: populatedUser._id,
                email: populatedUser.email,
                role: populatedUser.role,
                department: populatedUser.department,
                skills: populatedUser.skills
            },
            token
        });

    } catch (error) {
        res.status(500).json({
            error: "Login failed",
            details: error.message
        });
    }
};


export const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1]
        if (!token) return res.status(401).json({ error: "Unauthorized" })
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) return res.status(401).json({ error: "Unauthorized" });
        })
        res.json({ message: "Logout successfully" })
    } catch (error) {
        res.status(500).json({ error: "Logout failed", details: error.message });
    }
};

export const updateUser = async (req, res) => {
    const { userId, skills = [], role, email, department } = req.body
    try {
        const user = userId
            ? await User.findById(userId)
            : await User.findOne({ email })
        if (!user) return res.status(404).json({ error: "User not found" });

        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email })
            if (emailExists) return res.status(400).json({ error: "Email already in use" });
            user.email = email;
        }

        let resolvedDeptId = user.department;
        if (department !== undefined) {
            try {
                resolvedDeptId = department ? await resolveDepartment(department) : null
            } catch (err) {
                return res.status(400).json({ error: err.message })
            }
            user.department = resolvedDeptId;
        }

        if (skills.length) {
            user.skills = await resolveSkills(skills, resolvedDeptId)
        }
        user.role = role || user.role;

        await user.save();
        return res.json({ message: "User updated successfully" })

    } catch (error) {
        res.status(500).json({
            error: "Update Failed",
            details: error.message
        });
    }
};

export const getUser = async (req, res) => {

    try {
        const users = await User.find()
            .select("-password")
            .populate('department', 'name _id')
            .populate('skills', 'name _id')
        return res.json(users)
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch users",
            details: error.message
        });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ error: "You cannot delete your own account" });
        }

        await User.findByIdAndDelete(userId);
        return res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({
            error: "Failed to delete user",
            details: error.message
        });
    }
};

export const getDepartmentEmployees = async (req, res) => {
    try {
        const user = req.user;
        let filter = { role: "employee" };

        // Manager sees only their department; admin sees all employees.
        if (user.role === "manager") {
            filter.department = user.department;
        }

        const employees = await User.find(filter)
            .select("_id email department skills")
            .populate('department', 'name _id')
            .populate('skills', 'name _id');
        return res.json(employees);
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch employees",
            details: error.message
        });
    }
};

export const getCollaboratorCandidates = async (req, res) => {
    try {
        const user = req.user;
        const { excludeIds = [] } = req.query;

        const excludeList = Array.isArray(excludeIds) ? excludeIds : excludeIds ? [excludeIds] : [];
        excludeList.push(user._id.toString());

        const employees = await User.find({
            role: "employee",
            _id: { $nin: excludeList }
        })
            .select("_id email department skills")
            .populate('department', 'name _id')
            .populate('skills', 'name _id');
        return res.json(employees);
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch collaborator candidates",
            details: error.message
        });
    }
};