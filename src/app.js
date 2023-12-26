import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import UserRouter from './routes/users.js';
import MainCalender from './routes/main.calender.js';
import DiaryRouter from './routes/diary.js';
import CommentsRouter from './routes/comments.js';
import FeedsRouter from './routes/feeds.js';
import naverLogin from './Oauth/naver.login.js';
import kakaoLogin from './Oauth/kakao.login.js';
import googleLogin from './Oauth/google.login.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import http from 'http'
import initializeSocketIO from '../src/utils/io.js'
import os from 'os';

const app = express();
const PORT = 3000;

dotenv.config();

const corsOptions = {
  origin: ['http://localhost:3001', 'http://localhost:3000', 'https://clound-nine-4x2j.vercel.app'],
  credentials: true,
  exposedHeaders: ['Authorization', 'Refreshtoken', 'Expiredtime'],
};
const atlasURI = process.env.DB;

mongoose.connect(atlasURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch((err) => console.error('Error connecting to MongoDB Atlas:', err));

const swaggerDocument = YAML.load('./src/utils/swagger.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors(corsOptions));

app.use('/', [
  UserRouter,
  MainCalender,
  DiaryRouter,
  CommentsRouter,
  FeedsRouter,
  naverLogin,
  kakaoLogin,
  googleLogin,
]);

app.get("/", (req, res) => {
  res.send("why...");
});

// 헬스 체크 엔드포인트 추가
app.get("/health", (req, res) => {
  // 서버의 현재 상태 확인
  const isServerOnline = true; // 여기에 실제 서버 상태 확인 로직을 추가하세요

  // 서버 시작 시간 확인
  const serverStartTime = new Date().toISOString();

  // 서버의 CPU 및 메모리 사용량 확인
  const cpuUsage = os.loadavg()[0]; // CPU 사용량 (1분 평균)
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  // 사용 가능한 디스크 공간 확인 (예: 루트 디렉토리)
  const diskInfo = os.cpus(); // 여기에 실제 디스크 정보 확인 로직을 추가하세요

  // 응답 데이터 구성
  const healthStatus = {
    serverStatus: isServerOnline ? "Online" : "Offline",
    serverStartTime: serverStartTime,
    cpuUsage: cpuUsage,
    memoryUsage: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
    },
    diskSpace: diskInfo,
  };

  // 헬스 체크가 성공한 경우
  if (isServerOnline) {
    res.status(200).json(healthStatus);
  } else {
    // 서버가 오프라인인 경우
    res.status(503).json({ serverStatus: "Offline" });
  }
});

const server = http.createServer(app)
const io = new Server(server, {
  path: '/community/chat',
  cors: corsOptions,
})

initializeSocketIO(io);


server.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`, 'server', server.address());
});
// import express from "express";
// import UserRouter from "./routes/users.js";
// import MainCalender from "./routes/main.calender.js";
// import DiaryRouter from "./routes/diary.js";
// import CommentsRouter from "./routes/comments.js";
// import FeedsRouter from "./routes/feeds.js";
// import naverLogin from './Oauth/naver.login.js'
// import kakaoLogin from './Oauth/kakao.login.js'
// import googleLogin from './Oauth/google.login.js'
// import cors from "cors";
// import swaggerUi from 'swagger-ui-express';
// import YAML from 'yamljs';

// const app = express();
// const PORT = 3000


// const swaggerDocument = YAML.load(('./src/utils/swagger.yaml'));

// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }))

// app.use(express.urlencoded({ extended: true }))

// const corsOptions = {
//   origin: ['https://first-deploy-xi.vercel.app', 'http://localhost:3000'],
//   credentials: true,
//   exposedHeaders: ["Authorization", "Refreshtoken", "Expiredtime"]
// };


// app.use(express.urlencoded({extended : true}))
// app.use(cors(corsOptions));
// app.use(express.json());



// app.use("/", [
//   UserRouter,
//   MainCalender,
//   DiaryRouter,
//   CommentsRouter,
//   FeedsRouter,
//   naverLogin,
//   kakaoLogin,
//   googleLogin
// ]);

// app.get("/", (req, res) => {
//   res.send(`<h1>Success</h1>`);
// });

// app.listen(PORT, () => {
//   console.log(`${PORT}번 SERVER OPEN`);
// });
 

export default app;
