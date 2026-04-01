import jwt from "jsonwebtoken"
import User from "../models/user.js"

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
        return res.status(401).json({ error: "Access Denied. No Authorization header found.", message: "No Authorization header found" })
    }

    const token = authHeader.split(" ")[1]

    if (!token || token === "null" || token === "undefined") {
        return res.status(401).json({ error: "Access Denied. No valid token found.", message: "Token is missing or invalid" })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id).select('-password').populate('department', '_id name');
        if (!user) {
            return res.status(401).json({ error: "User not found", message: "User associated with token not found" });
        }
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expired", message: "Your session has expired. Please log in again." })
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid Token", message: "Token verification failed: " + error.message })
        }
        res.status(401).json({ error: "Authentication failed", message: error.message })
    }
}