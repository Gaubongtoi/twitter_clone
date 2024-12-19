import { EntityError, ErrorWithStatus } from './../models/Errors'
import express from 'express'
import { body, validationResult, ContextRunner, ValidationChain } from 'express-validator'
// import { RunnableValidationChains } from 'express-validator/src'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import HTTP_STATUS from '~/constants/httpStatus'
// Manually running validations
// can be reused by many routes

// sequential processing, stops running validations chain if the previous one fails.
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  // Hàm này sẽ nhận tham số là những validation đã được cấu hình bên users.middleware
  // Và trả về là 1 function handler, tương tự như cấu trúc của 1 request handler, nó có req, res, next
  // Đồng thời nhận vào 1 tham số là những validation có kiểu dữ liệu là RunnableValidationChains<ValidationChain>
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
      // Nếu như next() mà không truyền tham số nào thì nó sẽ chuyển tới request handler tiếp theo
      return next()
    }
    // errorsObj này sẽ trả về 1 obj chứa những lỗi
    // console.log(errors);
    const errorsObj = errors.mapped()
    // console.log(errorsObj)
    // {
    //   name: {
    //     type: 'field',
    //     value: '',
    //     msg: 'Name is required!',
    //     path: 'name',
    //     location: 'body'
    //   },
    //   confirm_password: {
    //     type: 'field',
    //     value: 'Vunhattan1233!',
    //     msg: 'Password Confirmation does not match Password!',
    //     path: 'confirm_password',
    //     location: 'body'
    //   }
    // }

    // Nó được kế thừa
    const entityError = new EntityError({ errors: {} })
    // console.log(entityError);

    // Lặp qua Object này
    for (const key in errorsObj) {
      // Lấy ra msg bằng destructuring
      // console.log(errorsObj);

      const { msg } = errorsObj[key]
      // console.log(msg)

      // console.log(msg);
      // console.log(errorsObj[key]);
      // Kiểm tra xem nó có phải là 1 đối tượng được tạo ra từ class ErrorWithStatus không và trong msg.status đó có khác với lỗi
      // validation không (UNPROCESSABLE_ENTITY: 422)
      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        // Nếu như next() mà có truyền tham số vào như 'next(msg)' thì nó sẽ chuyển tới error handler tiếp theo
        // Nếu như thoả mãn điều kiện, next lỗi qua errorMiddleware
        return next(msg)
      }
      //
      entityError.errors[key] = errorsObj[key]
      // console.log(entityError);
    }
    // console.log(entityError);

    // Nếu không thì dispatch ra cho người dùng 1 lỗi 422: Lỗi validation
    // res.status(422).json({ errors: errorsObj })
    // Nếu như next() mà có truyền tham số vào như 'next(msg)' thì nó sẽ chuyển tới error handler tiếp theo
    next(entityError)
  }
}
