import express from "express";
import { prisma } from "../utils/prisma/index.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import {client} from '../redis/redis.js';
import axios from "axios";
import qs from "qs";

dotenv.config();
const router = express.Router();

router.post("/kakao/callback", async function (req, res) {
  const { code } = req.body;
  console.log(code);
  const key = process.env.SECRET_KEY;
  try {
    const response = await axios({
      method: "POST",
      url: "https://kauth.kakao.com/oauth/token",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      data: qs.stringify({
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_CLIENT_ID,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code: code,
      }),
    });

    const { access_token } = response.data;

    const userResponse = await axios({
      method: "GET",
      url: "https://kapi.kakao.com/v2/user/me",
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const findUser = await prisma.users.findFirst({
      where: { email: userResponse.data.kakao_account.email },
    });

    if (findUser) {
      const accesstoken = jwt.sign({ userId: findUser.userId }, key, {
        expiresIn: "30m",
      });
      const refreshtoken = jwt.sign({ userId: findUser.userId }, key, {
        expiresIn: "7d",
      });
      
      const token_time = jwt.verify(accesstoken, key);

      await client.set(`RefreshToken:${findUser.userId}`, refreshtoken, "EX", 7 * 24 * 60 * 60 );


      res.setHeader("Authorization", `Bearer ${accesstoken}`);
      res.setHeader("Refreshtoken", refreshtoken);
      res.setHeader("Expiredtime", token_time.exp);

      console.log("======성공1======");

      return res.json({ message: `${findUser.username}님 환영합니다.` });
    } else {
      var userResponseIdString = userResponse.data.id.toString();
      var kakaoIdsubString = userResponseIdString.substring(0, 8);

      const encryptionPassword = await bcrypt.hash(kakaoIdsubString, 10);

      const createUser = await prisma.users.create({
        data: {
          email: userResponse.data.kakao_account.email,
          username: userResponse.data.properties.nickname,
          password: encryptionPassword,
          profileImg: userResponse.data.properties.profile_image,
          userType : 'K'
        },
      });
      const accesstoken = jwt.sign({ userId: createUser.userId }, key, {expiresIn: "30m"});
      const refreshtoken = jwt.sign({ userId: createUser.userId }, key, {expiresIn: "7d"});

      await client.set(`RefreshToken:${createUser.userId}`, refreshtoken, "EX", 7 * 24 * 60 * 60 );

      const token_time = jwt.verify(accesstoken, key);

      res.setHeader("Authorization", `Bearer ${accesstoken}`);
      res.setHeader("Refreshtoken", refreshtoken);
      res.setHeader("Expiredtime", token_time.exp);
      console.log("======성공2======");
      return res.json({ message: "회원가입이 완료되었습니다." });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server_Error" });
  }
});

export default router;