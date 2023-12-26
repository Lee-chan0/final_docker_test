import express from "express";
import { prisma } from "../utils/prisma/index.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { getDate, addHours } from "date-fns";

const router = express.Router();

// let currentReferenceDate = new Date(); // 기본적으로 현재 날짜를 사용
// let currentDate = addHours(currentReferenceDate, 9); // 한국 시간 기준으로 설정

/* 메인페이지 조회 ( 캘린더, 회원정보(회원프로필 이미지) ) */

router.get("/diary/calendar/:year/:month", authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { year, month } = req.params; // 파라미터로부터 년도와 월 값 가져오기

    // year와 month를 기반으로 날짜 범위 계산
    const startDate = new Date(year, month - 1, 1); // month는 0부터 시작하기 때문에 -1
    const endDate = new Date(year, month, 0);

    const diaries = await prisma.diaries.findMany({
      where: {
        UserId: userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const modifiedDiaries = diaries.map((diary) => {
      const year = diary.createdAt.getFullYear();
      const month = diary.createdAt.getMonth() + 1;
      const date = diary.createdAt.getDate();

      diary.createdAt = `${year}. ${month}. ${date}.`; // 프론트에서 원하는 형식으로 데이터를 정리해서 보내주기 위한 코드
      return diary;
    });

    let userProfileImg = await prisma.users.findFirst({
      where: { userId },
      select: {
        userId: true,
        profileImg: true,
      },
    });

    if (!userProfileImg) {
      userProfileImg = null;
    }

    const arrayedDiaries = new Array(getDate(endDate)).fill(null);

    modifiedDiaries.map((diary) => {
      let index = diary.createdAt.split(".")[2].trim();
      arrayedDiaries[index - 1] = diary;
      return arrayedDiaries;
    });

    res.status(200).json({ data: arrayedDiaries, userProfileImg });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});


// router.get("/diary/calendar", authMiddleware, async (req, res, next) => {
//   try {
//     const { userId } = req.user;
//     currentReferenceDate = new Date()
//     currentDate = addHours(new Date(), 9);
//     const startDate = startOfMonth(currentDate);
//     const endDate = endOfMonth(currentDate);

//     const diaries = await prisma.diaries.findMany({
//       where: {
//         UserId: userId,
//         createdAt: {
//           gte: startDate,
//           lte: endDate,
//         },
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//     });

//     // 각 월에 맞는 빈 배열을 생성하고
//     // date을 1부터 차례대로 조회하여 값이 없으면 null을 push, 있다면 obj자체를 push
//     // 반환된 배열을 data로 res에 담아 보낸다

//     const modifiedDiaries = diaries.map((diary) => {            //timezone 추가해서 한국시간에 맞출것 ( 맞추지않으면 9시간 이전의 날자가 나올것 > 월말 월초에 영향이 있을 수 있음)
//       const year = diary.createdAt.getFullYear();
//       const month = diary.createdAt.getMonth() + 1;
//       const date = diary.createdAt.getDate();

//       diary.createdAt = `${year}. ${month}. ${date}.`; // 프론트에서 원하는 형식으로 데이터를 정리해서 보내주기 위한 코드
//       return diary;
//     });

//     let userProfileImg = await prisma.users.findFirst({
//       where: { userId },
//       select: {
//         userId: true,
//         profileImg: true,
//       },
//     });

//     if (!userProfileImg) {
//       userProfileImg = null
//     }

//     const arrayedDiaries = new Array(getDate(endDate)).fill(null); // 입력값이 없는 날의 경우 null값을 기본값으로 가지도록 배열을 만든다.

//     modifiedDiaries.map((diary) => {
//       let index = diary.createdAt.split(".")[2].trim(); // diary.createdAt = "2023. 1. 1." 형태의 값을 가지기에, 'day'에 해당하는 값을 가져오기 위한 코드
//       arrayedDiaries[index - 1] = diary;
//       return arrayedDiaries;
//     });

//     res.status(200).json({ data: arrayedDiaries, userProfileImg, });
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// });

// router.get("/diary/calendar/previousMonth", authMiddleware, async (req, res, next) => {
//   try {
//     const { userId } = req.user;

//     currentReferenceDate = subMonths(currentReferenceDate, 1); // 이전 달로 이동
//     currentDate = addHours(currentReferenceDate, 9); // 한국 시간 기준으로 설정

//     const startDate = startOfMonth(currentDate);
//     const endDate = endOfMonth(currentDate);

//     const diaries = await prisma.diaries.findMany({
//       where: {
//         UserId: userId,
//         createdAt: {
//           gte: startDate,
//           lte: endDate,
//         },
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//     });

//     // 데이터 가공 등 필요한 처리 수행
//     const modifiedDiaries = diaries.map((diary) => {
//       const year = diary.createdAt.getFullYear();
//       const month = diary.createdAt.getMonth() + 1;
//       const date = diary.createdAt.getDate();
//       diary.createdAt = `${year}. ${month}. ${date}.`;
//       return diary;
//     });

//     let userProfileImg = await prisma.users.findFirst({
//       where: { userId },
//       select: {
//         userId: true,
//         profileImg: true,
//       },
//     });

//     if (!userProfileImg) {
//       userProfileImg = null;
//     }

//     res.status(200).json({ data: modifiedDiaries, userProfileImg });
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// });

// router.get("/diary/calendar/nextMonth", authMiddleware, async (req, res, next) => {
//   try {
//     const { userId } = req.user;

//     currentReferenceDate = addMonths(currentReferenceDate, 1); // 다음 달로 이동
//     currentDate = addHours(currentReferenceDate, 9); // 한국 시간 기준으로 설정

//     const startDate = startOfMonth(currentDate);
//     const endDate = endOfMonth(currentDate);

//     const diaries = await prisma.diaries.findMany({
//       where: {
//         UserId: userId,
//         createdAt: {
//           gte: startDate,
//           lte: endDate,
//         },
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//     });

//     // 데이터 가공 등 필요한 처리 수행
//     const modifiedDiaries = diaries.map((diary) => {
//       const year = diary.createdAt.getFullYear();
//       const month = diary.createdAt.getMonth() + 1;
//       const date = diary.createdAt.getDate();
//       diary.createdAt = `${year}. ${month}. ${date}.`;
//       return diary;
//     });

//     let userProfileImg = await prisma.users.findFirst({
//       where: { userId },
//       select: {
//         userId: true,
//         profileImg: true,
//       },
//     });

//     if (!userProfileImg) {
//       userProfileImg = null;
//     }

//     res.status(200).json({ data: modifiedDiaries, userProfileImg });
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// });


export default router;
/* 메인페이지 조회 ( 캘린더, 회원정보(회원프로필 이미지) ) */

/* 기본 페이지 조회일 뿐, 좌우 버튼으로 몇월달을 선택하느냐에 따라 startDate, endDate 값이 변화할 수 있어야 함
    왼쪽 버튼을 누르면 startOfMonth(currentdate) - 1, 오른쪽을 누르면 + 1 이 되는 로직 필요. 프론트와 상의 */
// router.get("/diary/calendar", authMiddleware, async (req, res, next) => {
//   try {
//     const { userId } = req.user;
//     const currentDate = addHours(new Date(), 9);
//     const startDate = startOfMonth(currentDate);
//     const endDate = endOfMonth(currentDate);

//     const diaries = await prisma.diaries.findMany({
//       where: {
//         UserId: userId,
//         createdAt: {
//           gte: startDate,
//           lte: endDate,
//         },
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//     });

//     // 각 월에 맞는 빈 배열을 생성하고
//     // date을 1부터 차례대로 조회하여 값이 없으면 null을 push, 있다면 obj자체를 push
//     // 반환된 배열을 data로 res에 담아 보낸다

//     const modifiedDiaries = diaries.map((diary) => {            //timezone 추가해서 한국시간에 맞출것 ( 맞추지않으면 9시간 이전의 날자가 나올것 > 월말 월초에 영향이 있을 수 있음)
//       const year = diary.createdAt.getFullYear();
//       const month = diary.createdAt.getMonth() + 1;
//       const date = diary.createdAt.getDate();

//       diary.createdAt = `${year}. ${month}. ${date}.`; // 프론트에서 원하는 형식으로 데이터를 정리해서 보내주기 위한 코드
//       return diary;
//     });

//     let userProfileImg = await prisma.users.findFirst({
//       where: { userId },
//       select: {
//         userId: true,
//         profileImg: true,
//       },
//     });

//     if (!userProfileImg) {
//       userProfileImg = null
//     }

//     const arrayedDiaries = new Array(getDate(endDate)).fill(null); // 입력값이 없는 날의 경우 null값을 기본값으로 가지도록 배열을 만든다.

//     modifiedDiaries.map((diary) => {
//       let index = diary.createdAt.split(".")[2].trim(); // diary.createdAt = "2023. 1. 1." 형태의 값을 가지기에, 'day'에 해당하는 값을 가져오기 위한 코드
//       arrayedDiaries[index - 1] = diary;
//       return arrayedDiaries;
//     });

//     res.status(200).json({ data: arrayedDiaries, userProfileImg, });
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// });


// // params에 현재 월의 값에 -1 을 해주면 이전달 조회
// // params에 현재 월의 값에 +1 을 해주면 다음달 조회
// /* 이전달 조회 */
// router.get("/diary/calendar/previousMonth/:year/:month/:date", authMiddleware, async (req, res, next) => {
//   try {
//     const { userId } = req.user;
//     let { year, month, date } = req.params
//     year = month === 0 ? year - 1 : year;

//     console.log(`year ${year}, month ${month}, date ${date}`)
//     const currentDate = addHours(new Date(year, month -2, date), 0);
//     const startDate = startOfMonth(currentDate);
//     const endDate = endOfMonth(currentDate);

  
//     const diaries = await prisma.diaries.findMany({
//       where: {
//         UserId: userId,
//         createdAt: {
//           gte: startDate,
//           lte: endDate,
//         },
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//     });

//     // 각 월에 맞는 빈 배열을 생성하고
//     // date을 1부터 차례대로 조회하여 값이 없으면 null을 push, 있다면 obj자체를 push
//     // 반환된 배열을 data로 res에 담아 보낸다

//     const modifiedDiaries = diaries.map((diary) => {            //timezone 추가해서 한국시간에 맞출것 ( 맞추지않으면 9시간 이전의 날자가 나올것 > 월말 월초에 영향이 있을 수 있음)
//       const year = diary.createdAt.getFullYear();
//       const month = diary.createdAt.getMonth() + 1;
//       const date = diary.createdAt.getDate();

//       diary.createdAt = `${year}. ${month}. ${date}.`; // 프론트에서 원하는 형식으로 데이터를 정리해서 보내주기 위한 코드
//       return diary;
//     });
  
//     let userProfileImg = await prisma.users.findFirst({
//       where: { userId },
//       select: {
//         userId: true,
//         profileImg: true,
//       },
//     });

//     if (!userProfileImg) {
//       userProfileImg = null
//     }

//     const arrayedDiaries = new Array(getDate(endDate)).fill(null); // 입력값이 없는 날의 경우 null값을 기본값으로 가지도록 배열을 만든다.

//     modifiedDiaries.map((diary) => {
//       let index = diary.createdAt.split(".")[2].trim(); // diary.createdAt = "2023. 1. 1." 형태의 값을 가지기에, 'day'에 해당하는 값을 가져오기 위한 코드
//       arrayedDiaries[index - 1] = diary;
//       return arrayedDiaries;
//     });

//     res.status(200).json({ data: arrayedDiaries, userProfileImg, });
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// });

// /* 다음달 조회 */
// router.get("/diary/calendar/nextMonth/:year/:month/:date", authMiddleware, async (req, res, next) => {
//   try {
//     const { userId } = req.user;
//     let { year, month, date } = req.params
//     year = month === 11 ? year + 1 : year;

//     console.log(`year ${year}, month ${month}, date ${date}`)
//     const currentDate = addHours(new Date(year, month , date), 0);
//     const startDate = startOfMonth(currentDate);
//     const endDate = endOfMonth(currentDate);

  
//     const diaries = await prisma.diaries.findMany({
//       where: {
//         UserId: userId,
//         createdAt: {
//           gte: startDate,
//           lte: endDate,
//         },
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//     });

//     // 각 월에 맞는 빈 배열을 생성하고
//     // date을 1부터 차례대로 조회하여 값이 없으면 null을 push, 있다면 obj자체를 push
//     // 반환된 배열을 data로 res에 담아 보낸다

//     const modifiedDiaries = diaries.map((diary) => {            //timezone 추가해서 한국시간에 맞출것 ( 맞추지않으면 9시간 이전의 날자가 나올것 > 월말 월초에 영향이 있을 수 있음)
//       const year = diary.createdAt.getFullYear();
//       const month = diary.createdAt.getMonth() + 1;
//       const date = diary.createdAt.getDate();

//       diary.createdAt = `${year}. ${month}. ${date}.`; // 프론트에서 원하는 형식으로 데이터를 정리해서 보내주기 위한 코드
//       return diary;
//     });
  
//     let userProfileImg = await prisma.users.findFirst({
//       where: { userId },
//       select: {
//         userId: true,
//         profileImg: true,
//       },
//     });

//     if (!userProfileImg) {
//       userProfileImg = null
//     }

//     const arrayedDiaries = new Array(getDate(endDate)).fill(null); // 입력값이 없는 날의 경우 null값을 기본값으로 가지도록 배열을 만든다.

//     modifiedDiaries.map((diary) => {
//       let index = diary.createdAt.split(".")[2].trim(); // diary.createdAt = "2023. 1. 1." 형태의 값을 가지기에, 'day'에 해당하는 값을 가져오기 위한 코드
//       arrayedDiaries[index - 1] = diary;
//       return arrayedDiaries;
//     });

//     res.status(200).json({ data: arrayedDiaries, userProfileImg, });
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// });


