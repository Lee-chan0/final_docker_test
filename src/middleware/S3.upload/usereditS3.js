import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"; 
import dotenv from "dotenv";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";

dotenv.config();

const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY2,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY2,
  },
});

const allowedExtensions = [".png", ".jpg", ".jpeg", ".bmp"];

const imageUpload = multer({
  storage: multerS3({
    s3: s3, 
    bucket: "fileimageupbucket",
    key: (req, file, callback) => {
      const uploadDirectory = req.query.directory ?? "";

      const extension = path.extname(file.originalname);
      if (!allowedExtensions.includes(extension)) {
        return callback(new Error("wrong extension"));
      }
      callback(null, `${uploadDirectory}/${Date.now()}.png`);
    },
    acl: "public-read-write",
    contentType: multerS3.AUTO_CONTENT_TYPE
  }),
});

export default imageUpload;
