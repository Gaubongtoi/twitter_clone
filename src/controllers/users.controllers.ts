import { Request, Response } from 'express'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { RegisterReqBody } from '~/models/requests/User.requests'
// Controller: chứa các file nhận request từ middleware, những file này sẽ chứa các function handler
// Đây sẽ là nơi tiếp nhận những req từ phía middleware, sau đó gọi đến service để xử lý logic nghiệp vụ
// và trả về response
export const loginController = (req: Request, res: Response) => {
  // json auto status(200)
  res.json({
    msg: 'Login Success'
  })
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response) => {
  // json auto status(200)
  // Muốn cấu hình kiểu dữ liệu cho body trong req, ta tạo ra 1 thư mục models/requests/User.requests.ts
  // Sau đó khai báo biến và kiểu dữ liệu cho trường đó
  // req defautl type của nó là Request<P = core.ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = qs.ParsedQs, Locals extends Record<string, any> = Record<string, any>>
  // Chúng ta có thể modify lại cho ReqBody = any bằng interface đã được tạo ra ở models/requests/User.requests.ts
  // => req.body sẽ có kiểu dữ liệu là RegisterReqBody
  // const { email, password,  } = req.body
  try {
    const result = await usersService.register(req.body)
    return res.json({
      msg: 'Register success',
      result
    })
  } catch (err) {
    console.log(err)
    return res.json({
      msg: 'Register Failed'
    })
  }
}
