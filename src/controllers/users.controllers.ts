import { Request, Response } from 'express'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { LogoutReqBody, RegisterReqBody, TokenPayload } from '~/models/requests/User.requests'
import User from '~/models/schema/User.schema'
// import { ObjectId } from 'mongodb'
import { ErrorWithStatus } from '~/models/Errors'
import databaseService from '~/services/database.services'
import { ObjectId } from 'mongodb'
import HTTP_STATUS from '~/constants/httpStatus'
// Controller: chứa các file nhận request từ middleware, những file này sẽ chứa các function handler
// Đây sẽ là nơi tiếp nhận những req từ phía middleware, sau đó gọi đến service để lấy ra các method xử lý logic nghiệp vụ - CURD
// và trả về response lại cho phía client
export const loginController = async (req: Request, res: Response) => {
  // json auto status(200)
  const user = req.user as User
  if (user && user._id) {
    const user_id = user._id
    const result = await usersService.login(user_id.toString())
    return res.json({
      msg: 'Login success',
      result
    })
  } else {
    // Xử lý trường hợp user._id không tồn tại
    throw new ErrorWithStatus({ message: 'User ID not found', status: 400 })
  }
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response) => {
  // throw new Error('Loi roi')
  // json auto status(200)
  // Muốn cấu hình kiểu dữ liệu cho body trong req, ta tạo ra 1 thư mục models/requests/User.requests.ts
  // Sau đó khai báo biến và kiểu dữ liệu cho trường đó
  // req defautl type của nó là Request<P = core.ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = qs.ParsedQs, Locals extends Record<string, any> = Record<string, any>>
  // Chúng ta có thể modify lại cho ReqBody = any bằng interface đã được tạo ra ở models/requests/User.requests.ts
  // => req.body sẽ có kiểu dữ liệu là RegisterReqBody
  // const { email, password,  } = req.body
  const result = await usersService.register(req.body)
  return res.json({
    msg: 'Register success'
    // result
  })
}

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutReqBody>, res: Response) => {
  const { refresh_token } = req.body
  const result = await usersService.logout(refresh_token)
  // console.log(result)

  return res.json(result)
}

export const verifyEmailController = async (req: Request, res: Response) => {
  const { user_id } = req.decode_verify_email_token as TokenPayload
  const user = await databaseService.users.findOne({
    _id: new ObjectId(user_id)
  })
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: 'User not found'
    })
  }
  // Đã verify
  if (user.email_verify_token === '') {
    return res.status(HTTP_STATUS.OK).json({
      message: 'Email Verified!'
    })
  }
  const result = await usersService.updateEmailVerifyToken(user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: 'Email verify success!',
    result
  })
}
