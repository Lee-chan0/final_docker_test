import { S3 } from '@aws-sdk/client-s3'; 
import { v4 as uuidv4 } from 'uuid'; 
import multer from 'multer';
import multerS3 from 'multer-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3({ 
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    region: 'ap-northeast-2'
});


export const upload = multer({
    storage: new multerS3({
        s3: s3,
        bucket: 'finaldrawings',
        key(req, file, cb) {
            cb(null, uuidv4() + '-' + file.originalname); // Generate a unique key for the file
        },                              
        contentType: multerS3.AUTO_CONTENT_TYPE
    }),
});

// const s3BaseUrl = `https://${bucketName}.s3.${region}.amazonaws.com/`
// image url에 해당 값을 할당해주면 된다. (업로드 이후 post할 때 diary table에 삽입)
// 혹은 req.file.location에 multer가 해당 url을 담아주기에, const ImageUrl = req.file.location으로 설정해도 된다
