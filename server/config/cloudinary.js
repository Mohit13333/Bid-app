import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import "dotenv/config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePaths) => {
  if (!localFilePaths || localFilePaths.length === 0) return [];

  try {
    const uploadPromises = localFilePaths.map(async (filePath) => {
      const response = await cloudinary.uploader.upload(filePath, {
        resource_type: "auto",
      });

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return response.secure_url;
    });

    const uploadedImages = await Promise.all(uploadPromises);
    return uploadedImages;
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error.message);

    localFilePaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          console.error(
            "Error deleting file after failed upload:",
            unlinkError.message
          );
        }
      }
    });

    return [];
  }
};

export default uploadOnCloudinary;
