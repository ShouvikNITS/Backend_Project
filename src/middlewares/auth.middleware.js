// it will verify whether user is present or not

import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";

export const verifyJWT = asyncHandler(async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token) {
            throw new ApiError(401, "Unauthorized request incoming")
        }
    
        const decodedTokenInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedTokenInfo?._id).select(
            "-password -refreshToken"
        )
    
        if(!user) {
            throw new ApiError(401, "Invalid Access Token")
        }
        
        req.user = user
        next()              // tells the route that i have completed then what to run


    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")        
    }

} )