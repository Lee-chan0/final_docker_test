import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
    {
        chat: String,
        user: {
            id: {
                type: mongoose.Schema.ObjectId,
                ref: "User",
            },
            name: String,
        },
    },
    { timestamp: true }
);

const Chat = mongoose.model('Chat', chatSchema); // chatSchema를 모델로 만들기
export default Chat; // Chat 모델을 export