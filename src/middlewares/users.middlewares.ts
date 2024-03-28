import { Request, Response, NextFunction } from 'express'
// Middleware: đóng vai trò là cầu nối giữa người dùng và phần nhân của hệ thống
// là trung gian của req/res và các xử lý logic bên trong web server
// Middleware sau khi được thiết lập, các req từ phía người dùng khi gửi lên ExpressJS sẽ
// thực hiện lần lượt qua các hàm Middleware cho đến khi trả về response cho người dùng
// Các hàm này có thể truy cập đến các đối tượng request, response, hàm Middleware tiếp theo - next
// và đối tượng lỗi - err nếu cần thiết
export const loginValidator = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing email or password'
    })
  }
  // Một hàm Mdw sau khi hoạt động xong, nếu chưa phải là cuối cùng trong chuỗi các hàm cần thực hiện
  // sẽ cần gọi đến method next() để chuyển sang hàm tiếp theo, bằng không xử lý sẽ bị treo tại hàm đó
  next()
}
