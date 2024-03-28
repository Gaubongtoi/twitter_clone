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
import {run} from './services/database.services'
const app = express()
const port = 4001
// import { Request, Response, NextFunction } from 'express'
app.use(express.json());

app.use('/api/user', usersRouter)

app.get('/', (req, res) => {
  res.send('Hello World!')
})
run().catch(console.dir);
app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`)
})
