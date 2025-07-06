import { Router } from "express";
import { registerUser, loginUser, logOutUser, refreshAccessToken, getCurrentUser, updateAccount } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)
router.route("/getUser").post(verifyJWT, getCurrentUser)


// Secured routes

router.route("/logout").post(verifyJWT, logOutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/updateAccount").post(verifyJWT, updateAccount)


export default router;