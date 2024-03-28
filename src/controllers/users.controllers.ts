import { Request, Response } from 'express'
// Controller: chứa các file nhận request từ middleware, những file này sẽ chứa các function handler 
// Đây sẽ là nơi tiếp nhận những req từ phía middleware, sau đó gọi đến service để xử lý logic nghiệp vụ
// và trả về response
export const loginController = (req: Request, res:Response) => {
  // json auto status(200)
  res.json({
    msg: 'Login Success'
  })
}