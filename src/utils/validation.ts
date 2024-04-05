import express from 'express'
import { body, validationResult, ContextRunner, ValidationChain } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/src/middlewares/schema'
// Manually running validations
// can be reused by many routes

// sequential processing, stops running validations chain if the previous one fails.
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  // Hàm này sẽ nhận tham số là những validation đã được cấu hình bên users.middleware
  // Và trả về là 1 function handler, tương tự như cấu trúc của 1 handler, nó có req, res, next
  // Đồng thời nhận vào 1 tham só là những validation có kiểu dữ liệu là RunnableValidationChains<ValidationChain>
  // * RunnableValidationChains: là 1 kiểu dữ liệu đại diện cho 1 chuỗi các quy tắc validation có thể chạy được
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // validation.run(req): là 1 phương thức của checkSchema() được sử dụng để chạy tất cả các quy tắc
    // xác thực được định nghĩa trong 'validation', nó sẽ nhận tham số truyền vào là request được truyền tới trong
    // body (param, query, headers) và áp dụng các quy tắc xác thực trong schema
    await validation.run(req)
    // Sau khi xử lý xong, tiến hành kiểm tra xem có lỗi nào được trả về từ quá trình validation hay không bằng validationResult(req)
    const errors = validationResult(req)
    // Nếu không có lỗi thì chuyển tiếp tới handler tiếp theo
    if (errors.isEmpty()) {
      return next()
    }
    // Nếu không thì dispatch ra cho người dùng 1 lỗi 400: lỗi phía client nhập sai
    res.status(400).json({ errors: errors.mapped() })
  }
}
