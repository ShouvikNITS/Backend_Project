import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFile = async (localPath) => {
    try {
        if(!localPath) return null
        //Upload file
        const response = await cloudinary.uploader.upload(localPath, {
            resource_type: "auto"
        })
        //File uploaded
        console.log("File is uploaded successfully ", response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localPath) //Remove the locally saved temp file as upload failed
        return null;
    }
}

export {uploadFile}