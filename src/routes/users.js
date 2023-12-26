import express from "express";
import { prisma } from "../utils/prisma/index.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import authMiddleware from "../middleware/auth.middleware.js";
import {client} from '../redis/redis.js';
import nodemailer from 'nodemailer';
import cron, { schedule } from 'node-cron';
import imageUpload from '../middleware/S3.upload/usereditS3.js'


dotenv.config();

const router = express.Router();

cron.schedule('0 * * * *', async() => {
  await deleteUser();
}, {
  scheduled : true,
  timezone : "Asia/Seoul"
})

async function deleteUser () {
  try{
    const currentDate = new Date();
    console.log(currentDate);

    const deletedAtUser = await prisma.users.findMany({
      where : {
        deletedAt : {
          lte : currentDate
        }
      }
    });

    for (const user of deletedAtUser) {
      await prisma.users.delete({
        where : {
          userId : user.userId
        }
      })
    }

    console.log(`${deletedAtUser.length}명의 데이터가 삭제되었습니다.`)
  }catch(err){
    console.error(err);
    return res.status(500)
  }
}


const userVerificationCodes = {};

// 회원가입
router.post("/signup", async(req, res, next) => {
  const {email, password, username} = req.body;
  try{
    const isExitsEmail = await prisma.users.findFirst({where : {email : email}});
    if(isExitsEmail){return res.status(400).json({message : "이미 가입된 이메일 입니다."})};

    const Authenticationcode = Math.random().toString(36).substring(2, 8);

    const mailer = nodemailer.createTransport({
      service : "gmail",
      auth : {
        user : "yab0403777@gmail.com",
        pass : "atun uixk yiit gcmt",
      }
    });
    const htmlContent = `
    <div style="font-family: 'Arial', sans-serif; max-width: 400px; margin: 20px auto; background-color: #fdfdfd; padding: 20px; border-radius: 15px; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2); border: 3px solid papayawhip; color: #000; text-align: center;">
      <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #000; font-weight: normal;">NINE Cloud에 오신 것을 환영합니다.</h2>
      <p style="font-size: 14px; margin-bottom: 15px;">이메일 인증을 위한 코드가 도착했습니다.</p>
      <p style="font-size: 24px; font-weight: bold; margin-bottom: 20px;"> 인증코드: ${Authenticationcode} </p>
      <div style="font-size: 12px; color: #000;">- NINE Cloud를 즐겨보세요 -</div>
    </div>
  `;
  

  const mailOptions = {
    from : "yab0403777@gmail.com",
    to : email,
    subject : "[NINE Cloud에서 보낸 인증코드]",
    html : htmlContent,
    text : `인증 코드 : ${Authenticationcode}를 입력해주세요.`,
  };

  mailer.sendMail(mailOptions, (error, info) => {
    if(error){
      console.error(error);
      return res.status(500).json({message : "메일 전송도중 Error가 발생했습니다."})
    }
    console.log(`이메일 전송 정보 : ${info.response}`);

    userVerificationCodes[email] = Authenticationcode;

    return res.status(201).json({message : "이메일 전송 완료"});
  })
  }catch(err){
    console.error(err);
    return res.status(500).json({message : "Server Error"})
  }
})


// 이메일 인증 후, 회원가입 완료 로직
router.post("/complete-signup", async(req, res) => {
  const {email, Authenticationcode, password, username} = req.body;
  try{
    const serverAuthenticationCode = userVerificationCodes[email];

    if(Authenticationcode === serverAuthenticationCode){
      const encryptionPassword = await bcrypt.hash(password, 10);

      const createUser = await prisma.users.create({
        data : {
          email : email,
          password : encryptionPassword, // encryptionPassword
          username : username
        }
      });

      const userInfo = await prisma.users.findFirst({
        where : {email : email},
        select : {
          userId : true,
          username : true,
          userType : true,
          email : true,
        }
      });
      return res.status(201).json({message : `${createUser.username}님, 회원가입이 완료되었습니다.`, data : userInfo});
    }else {
      return res.status(400).json({message : "인증 코드가 올바르지 않습니다."});
    }
  }catch(err){
    console.error(err);
    return res.status(500).json({message : "Server Error"});
  }
})


// 일반 로그인
router.post("/signin", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const key = process.env.SECRET_KEY;

    const findUser = await prisma.users.findFirst({ where: { email: email } });
    if (!findUser) {
      return res.status(400).json({ msg: `존재하지 않는 email입니다.` });
    }

    // let decodedPassword = false // 테스트를 위해 수정한 부분, 수정이 끝나면 아래 original code 와 교체할것
    // if (password == findUser.password) {
    //   decodedPassword = true}


    const decodedPassword = await bcrypt.compare(password, findUser.password);

    if (!decodedPassword) {
      return res.status(400).json({ msg: "비밀번호가 일치하지 않습니다." });
    }

    if(findUser.deletedAt){
      return res.status(201).json({message : "이미 탈퇴처리된 계정입니다. 복구 하시겠습니까?"})
    }

    let profileImage = findUser.profileImg;

    const accessToken = jwt.sign({ userId: findUser.userId }, key, {
      expiresIn: "6h",
    });

    const refreshToken = jwt.sign({ userId: findUser.userId }, key, {
      expiresIn: "7d",
    });

    await client.set(`RefreshToken:${findUser.userId}`, refreshToken, "EX", 7 * 24 * 60 * 60 );

    const access_token_time = jwt.verify(accessToken, process.env.SECRET_KEY);
    
    res.set("Expiredtime", access_token_time.exp);
    res.set("Authorization", `Bearer ${accessToken}`);
    res.set("Refreshtoken", `${refreshToken}`);

    return res.status(200).json({msg: `${findUser.username}님 환영합니다.`, profileImage: profileImage,});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: `server Error` });
  }
});


// 로그아웃
router.post("/logout", authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const result = await client.del(`RefreshToken:${userId}`)
    console.log(`키 삭제 결과: ${result}`);

    res.setHeader(`Authorization`, "");
    res.setHeader(`Refreshtoken`, "");

    return res.status(200).json({ msg: "로그아웃 되었습니다." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server Error" });
  }
});



// 내 정보 조회
router.get("/myInfo", authMiddleware, async (req, res, next) => {
  const { userId } = req.user;

  const user = await prisma.users.findFirst({
    where: { userId: +userId },
    select: {
      userId: true,
      username: true,
      email: true,
      profileImg: true,
      userType : true,
    },
  });
  if (!user) {
    return res.status(400).json({ msg: `존재하지 않는 유저입니다.` });
  }

  return res.status(200).json({ data: user })
});

// AccessToken 재발급 로직
router.post('/token', async(req, res, next) => {
  try{
    const {refreshtoken} = req.headers;
    const key = process.env.SECRET_KEY;
    const userInfo = jwt.verify(refreshtoken, key);
    const userId = userInfo.userId;

    const storedRefreshToken = await client.get(`RefreshToken:${userId}`);
    if(refreshtoken !== storedRefreshToken){
      await client.del(`RefreshToken:${userId}`);
      res.setHeader('Authorization', '');
      res.setHeader('Refreshtoken', '');
      return res.status(401).json({message : "비정상적인 접근입니다. 자동으로 로그아웃 됩니다."});
    }else {
      const newAceessToken = jwt.sign({userId : +userId}, key, {expiresIn : '30m'});
      const newRefreshToken = jwt.sign({userId : +userId}, key, {expiresIn : '7d'});

      const newAccessToken_time = jwt.verify(newAceessToken, key);
      await client.del(`RefreshToken:${userId}`);
      await client.set(`RefreshToken:${userId}`, newRefreshToken, "EX", 7 * 24 * 60 * 60 );
      const re = await client.get(`RefreshToken:${userId}`);
      console.log('===========redis에 제대로 담겼는지 체크 =============== : ', re);

      res.setHeader('Authorization', `Bearer ${newAceessToken}`);
      res.setHeader('Refreshtoken', newRefreshToken);
      res.setHeader('Expiredtime', newAccessToken_time.exp);

      return res.status(201).json({message : "AccessToken 발급 완료"});
    }
  }catch(err){
    console.error(err);
    return res.status(500).json({message : "Server Error"});
  }
});

// 내 정보 수정 API
router.patch('/myInfo/editmyInfo',imageUpload.single('image'), async(req, res, next) => {
  try{
    // const {userId} = req.user;
    const {username} = req.body;
    console.log(username);
    console.log(req.file);

    const imageUrl = req.file.location

    const editmyInfo = await prisma.users.update({
      where : {userId : 1},
      data : {
        username : username,
        profileImg : imageUrl
      }
    })

    return res.status(201).json({message : "수정이 완료되었습니다."});
  }catch(err) {
    console.error(err);
    return res.status(500).json({message : "Server Error"});
  }
});

// 비밀번호 변경 API
router.patch('/myInfo/edit-pw', authMiddleware, async(req, res, next) => {
  try{
      const {password, newPassword} = req.body;
      const {userId} = req.user;

      const findUser = await prisma.users.findFirst({where : {userId : +userId}});

      if(findUser.userType !== 'Common'){
        return res.status(400).json({message : "소셜로그인 사용자는 비밀번호를 변경할 수 없습니다."})
      }
      const decodedPW = await bcrypt.compare(password, findUser.password);

      if(!decodedPW)
      {return res.status(400).json({message : "비밀번호가 틀립니다."})};

      const encryptionPassword = await bcrypt.hash(newPassword, 10);

      await prisma.users.update({where : {userId : +userId},
        data : {
          password : encryptionPassword,
        }})


  }catch(err){
    console.error(err);
    return res.status(500).json({message : "Server Error"})
  }
})



// 회원 탈퇴 API
router.delete('/signoff', authMiddleware, async(req, res, next) => {
  try{
    const {userId} = req.user;

    // 현재 시간 기준으로 15일뒤의 날짜 계산
    const currentDate = new Date();
    const deleteDate = new Date(currentDate);

    deleteDate.setDate(deleteDate.getDate() + 1);

    deleteDate.setUTCHours(deleteDate.getUTCHours() + 9);

    const softDelete = await prisma.users.update({
      where : {userId : +userId},
      data : {
        deletedAt : deleteDate
      }
    })

    return res.status(201).json({message : "탈퇴처리가 완료되었습니다. 15일 동안 회원정보가 보류됩니다."});
  }catch(err){
    console.error(err);
    return res.status(500).json({message : "Server Error"});
  }
});

// 탈퇴 요청 취소 API
router.post('/cancel-signoff', async(req, res, next) => {
  try{
    const {email} = req.body;
    const currentDate = new Date();
    const deleteDate = new Date(currentDate);

    deleteDate.setUTCHours(deleteDate.getUTCHours() + 9);

    const findUser = await prisma.users.findFirst({where : {email : email}});

    if(!findUser){return res.status(400).json({message : "사용자가 없습니다."})};

    const subTime = findUser.deletedAt - deleteDate

    const Day = 24 * 60 * 60 * 1000;
    const Hour = 60 * 60 * 1000;

    const days = Math.floor(subTime / Day);
    const hours = Math.floor((subTime % Day) / Hour);

    const Cancel_SignOff = await prisma.users.update({
      where : {email : email},
      data : {
        deletedAt : null,
      }
    });

    return res.status(201).json({message : "탈퇴 요청이 취소되었습니다.", msg : `탈퇴까지 ${days}일, ${hours}시간 남았습니다.`});
  }catch(err){
    console.error(err);
    return res.status(500).json({message : "Server Error"});
  }
});




export default router;