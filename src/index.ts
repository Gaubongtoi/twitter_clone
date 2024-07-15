// // Tao ra 1 kieu du lieu Handle: Day la 1 loai ham khong nhan tham so va tra ve 1
// // Promise chua 1 gia tri kieu string
// type Handle = () => Promise<string>
// const name: string = 'Dư Thanh Được'
// // Sau khi da tao ra type cho handle, bat buoc handle phai la 1 function khong nhan tham so va phai tra ve 1 Promise
// // chua 1 gia tri kieu string
// const handle: Handle = () => Promise.resolve(name)
// interface User {
//   name: string
//   age?: number
// }
// const render = (user: User) => {
//   console.log(user);
// }
// const user = {name: "Duc"}
// render(user)

// console.log(name)
// handle().then(console.log)
// const express = require('express')
import express from 'express'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/errors.middlewares'
import mediasRouter from './routes/medias.routes'
import { initFolder } from './utils/files'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from './constants/dir'
import staticRouter from './routes/static.routes'
import tweetsRoute from './routes/tweets.routes'
import bookmarksRouter from './routes/bookmarks.routes'
import likesRouter from './routes/likes.routes'
import searchRouter from './routes/search.routes'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
// import './utils/faker'
const app = express()
const httpServer = createServer(app)
const port = process.env.PORT
const corsOptions = {
  origin: '*',
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
  exposedHeaders: 'X-Total-Count'
}
app.use(cors(corsOptions))
// console.log(option.development);

// Tạo folder uploads
initFolder()
// import { Request, Response, NextFunction } from 'express'
// Compile and encode json -> {obj}
app.use(express.json())
// Router of User
app.use('/api/user', usersRouter)
app.use('/api/medias', mediasRouter)
app.use('/api/tweets', tweetsRoute)
app.use('/api/bookmarks', bookmarksRouter)
app.use('/api/likes', likesRouter)
app.use('/api/search', searchRouter)

app.use('/static', staticRouter)
app.use('/static', express.static(UPLOAD_VIDEO_DIR))
// app.get('/', (req, res) => {
//   res.send('Hello World!')
// })
// Đây sẽ là nơi tiếp nhận hết tất cả các lỗi (error)
app.use(defaultErrorHandler)
// Connecting to MongoDatabase
databaseService.connect().then(() => {
  databaseService.indexTweets()
})
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
// Connect
// io.on('connection', (socket) => {}): dòng này lắng nghe sự kiện 'connection'. Khi bên phía client truy cập 
// vào website và sử dụng server để thao tác với các chức năng, thì nó sẽ được đăng ký 1 đối tượng socket 
io.on('connection', (socket) => {
  // Khi client muốn kết nối với Socket, nó sẽ gửi cho server một 'handshake HTTP request'
  const user_id = socket.handshake.auth.user_id // Lấy ra user_id từ thông tin xác thực của người dùng trong quá trình handshake
  // { '668223d809420cd1cd153599': { socket_id: 'HZhQJLpUZs2X7GWmAAAD' } } 
  users[user_id] = {
    socket_id: socket.id 
  }
  // console.log(users);
  
  // socket.on -> lắng nghe sự kiện 'private message' từ emit bên phía client A. Khi sự kiện này xảy ra,
  // hàm callback sẽ được gọi với tham số là data chứa thông tin tin nhắn
  socket.on('private message', (data) => {
    // Lấy ra socket_id của người sẽ nhận tin nhắn này
    const receiver_socket_id = users[data.to].socket_id
    // Gửi về phía client B chứa thông tin tin nhắn và user_id của người gửi
    socket.to(receiver_socket_id).emit('receiver private message', {
      content: data.content,
      from: user_id
    })
  })
  // Lắng nghe sự kiện disconnect bên phía client
  socket.on('disconnect', () => {
    delete users[user_id]
    console.log(`user ${socket.id} disconnect!`)
  })
})
httpServer.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`)
})
