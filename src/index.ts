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

const app = express()
const port = process.env.PORT
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

app.use('/static', staticRouter)
app.use('/static', express.static(UPLOAD_VIDEO_DIR))
// app.get('/', (req, res) => {
//   res.send('Hello World!')
// })
// Đây sẽ là nơi tiếp nhận hết tất cả các lỗi (error)
app.use(defaultErrorHandler)
// Connecting to MongoDatabase
databaseService.connect()
app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`)
})
