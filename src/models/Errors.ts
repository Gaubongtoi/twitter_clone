// import { stat } from "fs";
// Định nghĩa Type:
// Record<string, string> (default)
// => {[key: string]: string}

import HTTP_STATUS from '~/constants/httpStatus'
import { USER_MESSAGES } from '~/constants/messages'

// Ta biết được các key trong 1 obj luôn luôn là 1 string, việc chúng ta cần làm đó chỉ là quy định kiểu value cho ErrorType mà thôi
type ErrorType = Record<
  string,
  {
    msg: string
    // location: string,
    // value: any,
    // path: string,
    [key: string]: any
  }
>

// ErrorWithStatus này là class để cấu hình cho việc throw ra 1 lỗi nào khác ngoài lỗi 422 (UNPROCESSABLE_ENTITY)
export class ErrorWithStatus {
  // class này có 2 biến là message và status
  message: string
  status: number
  // cấu hình cho 2 tham số của constructor là 1 object chứa message, status có kiểu là string và number
  constructor({ message, status }: { message: string; status: number }) {
    this.message = message
    this.status = status
  }
}

// Thừa kế class ErrorWithStatus để hưởng 2 biến là status và message mà không cần khai báo 2 biến đó nữa
// EntityError này là dành cho việc throw ra những lỗi dành riêng cho Error validation 422
export class EntityError extends ErrorWithStatus {
  errors: ErrorType
  constructor({ message = USER_MESSAGES.VALIDATION_ERROR, errors }: { message?: string; errors: ErrorType }) {
    super({ message, status: HTTP_STATUS.UNPROCESSABLE_ENTITY })
    this.errors = errors
  }
}
