import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadFile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  jwt from "jsonwebtoken";

const generateAccessRefreshToken = async (userID) => {
    try {
        const user = await User.findById(userID)

        //Generate tokens
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //save refresh token to database for future retrieval
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})              //when save it will also trigger password, so no validation of password required here


        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from the frontend
    // validation of data sent: eg not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response

    const {fullname, email, username, password} = req.body
    // console.log("Fullname: %s\nEmail: %s\nUsername: %s\nPassword: %s", fullname, email, username, password);

    // if(fullName==="") {
    //     throw new ApiError(400, "Full name is required")
    // }

    // Efficient way to validate the data
    if (
        [fullname, email, username, password].some((field) => field?.trim() === "" )
    ) {
        throw new ApiError(400, "All fields are required")
    }
    
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    // console.log(existedUser)
    if(existedUser) {
        throw new ApiError(409, "username or email already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
        coverImageLocalPath = req.files.coverImage[0].path

    // console.log(avatarLocalPath)
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required")
    }

    const avatar = await uploadFile(avatarLocalPath)
    const coverImage = await uploadFile(coverImageLocalPath)

    if(!avatar) {
        throw new ApiError(400, "Avatar image is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user!!!")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )



} )

const loginUser = asyncHandler( async (req, res) => {
    // req.body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie



    const {email, username, password} = req.body

    if(!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user) {
        throw new ApiError(404, "user does not exist")
    }

    const isPasswordValid = await user.isPassword(password)

    if(!isPasswordValid) {
        throw new ApiError(404, "Invalid username or password")
    }

    const {accessToken, refreshToken} = await generateAccessRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // send cookies
    const options = {
        httpOnly: true,
        secure: true       //by default, cookies are modifiable in frontend, but this options made it to be only modifiable by the server
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In successfully!!!"
        )
    )

})

const logOutUser = asyncHandler(async (req, res) => {
    
    // updating refreshToken in DB
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined             // $set operator of mongoDB
            }
        },
        {
            new: true           // i want the new updated values in database
        }
    )

    const options = {
        httpOnly: true,
        secure: true       //by default, cookies are modifiable in frontend, but this options made it to be only modifiable by the server
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out successfully"))



})

// Generate refresh access token for frontend to hit a endpoint

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized access")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(404, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {newAccessToken, newRefreshToken} = await generateAccessRefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken", newAccessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200,
                {accessToken: newAccessToken, refreshToken: newRefreshToken}, "Acceess token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }



})

const changeCurrentUserPassword = asyncHandler(async(req, res) => {

    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    
    const isPasswordCorrect = await user.isPassword(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Old password invalid")
    }

    if(oldPassword===newPassword) {
        throw  new ApiError(400, "New password can't be same as old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})
    
    return res.status(200)
    .json(
        new ApiResponse(200, {}, "Password is changed successfully!!!")
    )


})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res.status(200)
    .json(new ApiResponse(200, req.user, "User successfully fetched"))
})

const updateAccount = asyncHandler(async(req, res) => {
    const {fullname, email} = req.body

    if(!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, updatedUser, "User credentials updated successfully"))


})

const updateUserAvatar = asyncHandler(async(req, res) => {

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "File is not uploaded")
    }

    const avatar = await uploadFile(avatarLocalPath)

    if(!avatar) {
        throw new ApiError(400, "Error uploading to cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"))


})
const updateUserCoverImage = asyncHandler(async(req, res) => {

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) {
        throw new ApiError(400, "File is not uploaded")
    }

    const coverImage = await uploadFile(coverImageLocalPath)

    if(!coverImage) {
        throw new ApiError(400, "Error uploading to cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"))


})



export {
    registerUser, 
    loginUser, 
    logOutUser, 
    refreshAccessToken, 
    changeCurrentUserPassword, 
    getCurrentUser,
    updateAccount,
    updateUserAvatar,
    updateUserCoverImage
}