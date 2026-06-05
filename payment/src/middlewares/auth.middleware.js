const jwt = require("jsonwebtoken");

function createAuthMiddleware(roles = ["user"]) {
    
    return async function authMiddleware(req, res, next) {

        const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if(!roles.includes(decoded.role)) {
                return res.status(403).json({ success: false, message: "Forbidden" });
            }

            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }
    }
}

module.exports = createAuthMiddleware;