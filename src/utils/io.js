import { Server } from 'socket.io'
import userController from '../Controllers/user.controller.js';
import chatController from '../Controllers/chat.controller.js';

const initializeSocketIO = function (server) {
  const io = new Server(server, {
    path: '/community/chat', // 해당 경로로 소켓 연결 설정
    cors: {
      origin: ['http://localhost:3001', 'http://localhost:3000', 'https://clound-nine-4x2j.vercel.app'],
      credentials: true,
    },
  });

  io.on('connection', async (socket) => {
    console.log('Client connected', socket.id);

    socket.on('login', async (userName, cb) => {
      try {
        const user = await userController.saveUser(userName, socket.id);
        const welcomeMessage = {
          chat: `${user.name} has joined the chat room`,
          user: { id: null, name: 'system' },
        };
        io.emit('message', welcomeMessage);
        cb({ ok: true, data: user });
      } catch (error) {
        cb({ ok: false, error: error.message });
      }
    });

    socket.on('sendMessage', async (message, cb) => {
      try {
        const user = await userController.checkUser(socket.id);
        const newMessage = await chatController.saveChat(message, user);
        io.emit('message', newMessage);
        cb({ ok: true });
      } catch (error) {
        cb({ ok: false, error: error.message });
      }
    });

    socket.on('disconnect', async () => {
      const user = await userController.checkUser(socket.id);
      if (user) {
        const leavingMessage = {
          chat: `${user.name} has left the chat room`,
          user: { id: null, name: 'system' },
        };
        io.emit('message', leavingMessage);
      }
    });
  });
}

export default initializeSocketIO