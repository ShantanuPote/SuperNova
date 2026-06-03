const jwt = require('jsonwebtoken')

function createAuthMiddleware( roles = [ "user"]){
    return async function authMiddleware(req,res,next){
        const token = req.cookies?.token || req.headers?.authorization?.split(' ')[ 1 ]

        if(!token){
            return res.status(401).json({message: 'unauthorized: no token provided'})
        }

        try{
            const decoded = await jwt.verify(token, process.env.JWT_SECRET)

            if(!roles.includes(decoded.role)){
                return res.status(403).json({
                    message: 'forbidden: Insufficient permission'
                })
            }

            req.user = decoded;
            next();

        }catch(err){
            return res.status(401).json({
                message: 'Unauthorized: Invalid token'
            })
        }

    }
}


module.exports = createAuthMiddleware;