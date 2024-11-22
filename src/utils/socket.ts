import { verifyAccessToken } from '~/utils/common'
import { Server } from 'socket.io'
import { ObjectId } from 'mongodb'
import Conservations from '~/models/schema/Conversations.schema'
import databaseService from '~/services/database.services'
import { TokenPayload } from '~/models/requests/User.requests'
import { UserVerifyStatus } from '~/constants/enums'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { Server as ServerHttp } from 'http'
import Notification from '~/models/schema/Notifications.schema'
const initSocket = (httpServer: ServerHttp) => {
  const io = new Server(httpServer, {
    // Cau hinh CORS cho toan bo http client duoc su dung server
    cors: {
      origin: '*'
    }
  })
  const users: {
    [key: string]: {
      socket_id: string
    }
  } = {}
  // Middleware cua Socket.io
  // Bao gom 1 callback chua object socket va 1 method next() tuong tu nhu 1 middleware cua express
  io.use(async (socket, next) => {
    const { Authorization } = socket.handshake.auth
    const access_token = Authorization?.split(' ')[1]
    try {
      const decode_authorization = await verifyAccessToken(access_token)
      const { verify } = decode_authorization as TokenPayload
      if (verify !== UserVerifyStatus.Verified) {
        // Throw ra 1 loi. Ben phia client se lang nghe su kien error nay
        throw new ErrorWithStatus({
          message: 'User not verified',
          status: HTTP_STATUS.FORBIDDEN
        })
      }
      // Truyen decode_authorization vao socket de su dung o cac middleware khac
      socket.handshake.auth.decode_authorization = decode_authorization
      socket.handshake.auth.access_token = access_token
      next() // -> io.on ben duoi
    } catch (error) {
      next({
        // Tham so bat buoc
        message: 'Unauthorized',
        name: 'UnauthorizedError',
        data: error
      })
    }
  })
  // Connect
  // io.on('connection', (socket) => {}): dòng này lắng nghe sự kiện 'connection'. Khi bên phía client truy cập
  // vào website, sử dụng server để thao tác với các chức năng và vượt qua được middleware thì nó sẽ được đăng ký 1 đối tượng socket
  io.on('connection', (socket) => {
    // Khi client muốn kết nối với Socket, nó sẽ gửi cho server một 'handshake HTTP request'
    const { user_id } = socket.handshake.auth.decode_authorization // Lấy ra user_id từ thông tin xác thực của người dùng trong quá trình handshake
    // { '668223d809420cd1cd153599': { socket_id: 'HZhQJLpUZs2X7GWmAAAD' } }
    users[user_id] = {
      socket_id: socket.id
    }
    socket.use(async (packet, next) => {
      const { access_token } = socket.handshake.auth
      try {
        // Check access token have expired yet
        await verifyAccessToken(access_token)
        next()
      } catch (error) {
        // Throw to middleware in server-side with event name is "error"
        next(new Error('Unauthorized'))
      }
    })
    socket.on('error', (err) => {
      if (err.message === 'Unauthorized') {
        // Disconnect
        socket.disconnect()
      }
    })
    // socket.on -> lắng nghe sự kiện 'send_message' từ emit bên phía client A. Khi sự kiện này xảy ra,
    // hàm callback sẽ được gọi với tham số là data chứa thông tin tin nhắn
    socket.on('send_message', async (data) => {
      // Lấy ra socket_id của người sẽ nhận tin nhắn này
      const receiver_socket_id = users[data.payload.receiver_id]?.socket_id
      const conversation = new Conservations({
        sender_id: new ObjectId(data.payload.sender_id as string),
        receiver_id: new ObjectId(data.payload.receiver_id as string),
        content: data.payload.content
      })
      // Gửi về phía client B chứa thông tin tin nhắn và user_id của người gửi
      const new_id = await databaseService.conservations.insertOne(conversation)
      await databaseService.notifications.insertOne(
        new Notification({
          type: 4,
          sender_id: new ObjectId(data.payload.sender_id as string),
          receiver_id: new ObjectId(data.payload.receiver_id as string),
          tweet_id: null,
          content: data.payload.content
        })
      )
      conversation._id = new_id.insertedId
      if (receiver_socket_id) {
        socket.to(receiver_socket_id).emit('receiver_message', {
          payload: conversation
        })
      }
    })
    // Lắng nghe sự kiện disconnect bên phía client
    socket.on('disconnect', () => {
      delete users[user_id]
      console.log(`user ${socket.id} disconnect!`)
    })
  })
}

export default initSocket
