import express from "express";
import { prisma } from "../utils/prisma/index.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();


/* 댓글 등록 */
router.post(
  "/diary/detail/secondaryComment/:diaryId/:commentId",
  authMiddleware,
  async (req, res, next) => {
    try {
      const { diaryId, commentId } = req.params;
      const { content } = req.body;
      const { userId } = req.user;

      await prisma.secondaryComments.create({
        data: {
          UserId: userId,
          DiaryId: +diaryId,
          CommentId: +commentId,
          content,
        },
      });
      res.status(201).json({ message: "대댓글이 등록되었습니다" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/* 댓글 조회 */
/* 댓글 조회의 경우, 댓글만 조회하는 경우는 없을것. 특정 포스팅등에 있는 댓글을 조회할것이기때문에 diaryId만을 필요로 한다 */
router.get(
  "/diary/detail/secondaryComment/:diaryId",
  async (req, res, next) => {
    try {
      const { diaryId } = req.params;

      const secondaryComments = await prisma.secondaryComments.findMany({
        where: {
          diaryId,
        },
      });

      return res.status(200).json({ data: secondaryComments });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
);

/* 댓글 수정 */
router.patch(
  "/diary/detail/secondaryComment/:diaryId/:commentId",
  authMiddleware,
  async (req, res, next) => {
    try {
      const { commentId } = req.params;
      const { userId } = req.user;
      const { content } = req.body;

      let comment = await prisma.comments.findFirst({
        where: { commentId: +commentId },
      });

      if (comment.UserId !== userId) {
        return res.status(401).json({ message: "수정 권한이 없습니다" });
      }

      await prisma.comments.update({
        where: { commentId: +commentId },
        data: {
          content,
          isUpdated: true,
        },
      });
      return res.status(201).json({ message: "댓글 수정 완료" });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
);

/* 댓글 삭제 */
router.delete(
  "/diary/detail/comment/:secondaryCommentId",
  authMiddleware,
  async (req, res, next) => {
    try {
      const { secondaryCommentId } = req.params;
      const { userId } = req.user;

      const comment = await prisma.secondaryComments.findFirst({
        where: {
          secondaryCommentId: +secondaryCommentId,
          UserId: +userId,
        },
      });

      if (!comment) {
        return res.status(401).json({ message: "댓글이 존재하지 않습니다" });
      }

      await prisma.secondaryComments.delete({
        where: { secondaryCommentId: +secondaryCommentId },
      });
      return res.status(201).json({ message: "댓글 삭제 완료" });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
);

export default router;
