import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadFile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export {registerUser}