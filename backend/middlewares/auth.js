import jwt from "jsonwebtoken"
import User from "../models/user.js"

export const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
        return res.status(401).json({ error: "Access Denied. No Token found." })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id).select('-password');
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid Token" })
    }
}