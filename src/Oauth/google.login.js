import express from "express";
import { prisma } from "../utils/prisma/index.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import {client} from '../redis/redis.js';
import axios from 'axios';

const router = express.Router();
dotenv.config();

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

router.post('/google/callback', async(req, res, next) => {
    const key = process.env.SECRET_KEY;
    const {code} = req.body;
    const resp = await axios.post(GOOGLE_TOKEN_URL, {
        code : code,
        client_id : process.env.GOOGLE_CLIENT_ID,
        client_secret : process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri : process.env.REACT_APP_GOOGLE_AUTH_REDIRECT_URI,
        grant_type : `authorization_code`
    });
    const resp2 = await axios.get(GOOGLE_USERINFO_URL, {
        headers : {
            authorization: `Bearer ${resp.data.access_token}`
        }
    });

    const findUser = await prisma.users.findFirst({where : {email : resp2.data.email}});

    if(findUser){
        const accesstoken = jwt.sign({userId : findUser.userId}, key, {expiresIn : '30m'});
        const refreshtoken = jwt.sign({userId : findUser.userId}, key, {expiresIn : '7d'});

        const access_token_time = jwt.verify(accesstoken, key);

        await client.set(`RefreshToken:${findUser.userId}`, refreshtoken, "EX", 7 * 24 * 60 * 60 );

        res.setHeader('Authorization', `Bearer ${accesstoken}`);
        res.setHeader('Refreshtoken', refreshtoken);
        res.setHeader('Expiredtime', access_token_time.exp);

        return res.status(201).json({message : `${findUser.username}님 환영합니다.`});
    }else {
        const googleUserId = resp2.data.id.substring(0, 8);
        const encryptionPassword = await bcrypt.hash(googleUserId, 10);

        const createUser = await prisma.users.create({
            data : {
                email : resp2.data.email,
                password : encryptionPassword,
                username : resp2.data.name,
                profileImg : resp2.data.picture,
                userType : 'G'
            }
        })
        const accesstoken = jwt.sign({userId : createUser.userId}, key, {expiresIn : '30m'});
        const refreshtoken = jwt.sign({userId : createUser.userId}, key, {expiresIn : '7d'});

        const access_token_time = jwt.verify(accesstoken, key);

        await client.set(`RefreshToken:${findUser.userId}`, refreshtoken, "EX", 7 * 24 * 60 * 60 );

        res.setHeader('Authorization', `Bearer ${accesstoken}`);
        res.setHeader('Refreshtoken', refreshtoken);
        res.setHeader('Expiredtime', access_token_time.exp);

        return res.status(201).json({message : "회원가입이 완료되었습니다."})
    }
})
export default router;