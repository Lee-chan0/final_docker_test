import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma/index.js";
import dotenv from "dotenv";
import {client} from '../redis/redis.js';

dotenv.config();

export default async (req, res, next) => {
  try {
    console.log('======미들웨어 IN=======');
    const {authorization, refreshtoken} = req.headers;

    const key = process.env.SECRET_KEY;

    const [tokenType, token] = authorization.split(" ");

    if (tokenType !== `Bearer`)
      throw new Error("토큰 타입이 일치하지 않습니다.");

    const verifyToken = jwt.verify(token, key);

    const userId = verifyToken.userId;
    const storedRefreshToken = await client.get(`RefreshToken:${userId}`);
    console.log('authmiddleware의 REFRESH TOKEN : ', refreshtoken);
    console.log('authmiddleware의 REDIS STORED REFRESH TOKEN : ', storedRefreshToken);

    if(storedRefreshToken !== refreshtoken){
      await client.del(`RefreshToken:${userId}`);
      res.setHeader('Authorization', '');
      res.setHeader('Refreshtoken', '');
      return res.status(400).json({message : "비정상적인 요청입니다. 자동으로 로그아웃 됩니다."})
    }

    const userInfo = await prisma.users.findFirst({
      where: { userId: userId },
    });
    if (!userInfo) throw new Error(`토큰 사용자가 존재하지 않습니다.`);

    req.user = userInfo;
    console.log('======미들웨어 OUT=======');
    next();
  } catch(err) {
    console.log('catch로 error 발생');
    console.error(err);
    if(err.name === "TokenExpiredError")
    {return res.status(401).json({message : "토큰이 만료되었습니다."})}
    else{
      res.setHeader('Authorization', '');
      res.setHeader('Refreshtoken', '');
      await client.del(`RefreshToken:${userId}`);

      return res.status(400).json({message : "비정상적인 요청입니다. 자동으로 로그아웃 됩니다."})}
  }
};