import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { startOfDay, endOfDay } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { upload } from '../middleware/S3.upload/multer.js'



const router = express.Router();

let lastViewTime = {};

setInterval(() => {
  const currentTime = new Date().getTime();
  for (const userId in lastViewTime) {
    if (currentTime - lastViewTime[userId] >= 600000) {
      delete lastViewTime[userId];
    }
  }
}, 600000);

/* 일기 상세 조회 */
router.get('/diary/detail/:diaryId', authMiddleware, async (req, res, next) => {
  try {
      const { diaryId } = req.params;
      const { userId } = req.user


      const isliked = await prisma.diaryLikes.findFirst({
        where : {
          DiaryId : +diaryId,
          UserId : userId
        }
      })

      const diaryDetail = await prisma.diaries.findFirst({
          where: { 
            diaryId: +diaryId,  
            OR : [
              {UserId : userId},
              {isPublic : true}
            ]
            
          }
      });

      if (!diaryDetail) {
        return res.status(400).json({ message : "존재하지 않는 일기입니다."})
      }

      if (userId in lastViewTime) {
        const lastTime = lastViewTime[userId]
        const currentTime = new Date().getTime()

        if (currentTime - lastTime < 600000) {
          return res.status(200).json({ data: diaryDetail})
        }
      }
      /* 조회수 기능 추가 */
      if (diaryDetail.UserId !== +userId) {

        lastViewTime[userId] = new Date().getTime()

        const updatedDiary = await prisma.diaries.update({
          where: { diaryId: +diaryId },
          data: { viewCount : diaryDetail.viewCount + 1 }
        })
        return res.status(200).json({ data: updatedDiary})
      } else {
        return res.status(200).json({ data: diaryDetail})
      }
  } catch (error) {
      return res.status(400).json({ error: error.message });
  }
});

/* 일기 등록 */
router.post('/diary/posting', authMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { EmotionStatus, content, isPublic, weather, sentence, temperature, humid, sleep } = req.body;

    const  imageUrl = req.file.location

    const today = new Date();
    const timeZone = 'Asia/Seoul';
    const todaySeoulTime = utcToZonedTime(today, timeZone);
    const startOfToday = startOfDay(todaySeoulTime);
    const endOfToday = endOfDay(todaySeoulTime);

    const diaryExists = await prisma.diaries.findFirst({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
        UserId: userId,
      },
    });

    if (diaryExists) {
      return res.status(300).json({ message: '오늘은 이미 작성한 글이 있습니다. 수정하시겠습니까?' });
    }

    const savedDiary = await prisma.diaries.create({
      data: {
        EmotionStatus : +EmotionStatus,
        content,
        image: imageUrl,
        isPublic: Boolean(isPublic),
        weather,
        sentence,
        createdAt: todaySeoulTime,
        temperature,
        humid,
        sleep,
        User: {
          connect : {userId},
      },  
      }
    });

    return res.status(201).json({ message: '다이어리 등록 완료', data: savedDiary });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

/* 일기수정 */
router.patch('/diary/edit/:diaryId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { diaryId } = req.params
    const { content, isPublic } = req.body;

    const diaryExists = await prisma.diaries.findFirst({
      where: {
        diaryId : +diaryId,
        UserId: userId,
      },
    });

    if (!diaryExists) {
      return res.status(300).json({ message: '작성된 일기가 없습니다' });
    }

    const savedDiary = await prisma.diaries.update({
      where : {
        diaryId : +diaryId
      },
      data: {
        content,
        isPublic: Boolean(isPublic),
      }
    });

    return res.status(201).json({ message: '다이어리 수정 완료', data: savedDiary });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});
  
/* 일기 삭제 */
router.delete('/diary/delete/:diaryId', authMiddleware, async (req, res, next) => {
try{
  const {diaryId} = req.params

  const diary = await prisma.diaries.findFirst({
    where: {diaryId : +diaryId}
  })

  if (!diary) {
    return res.status(401).json({ message : "삭제하려는 일기가 존재하지 않습니다"})
  }

  await prisma.diaries.delete({
    where: {diaryId : +diaryId}
  })

  return res.status(201).json({ message : "삭제 완료"})
}catch(error) {
  return res.status(400).json({ error: error.message })
}
})
  

export default router;