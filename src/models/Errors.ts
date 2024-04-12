// import { stat } from "fs";
// Định nghĩa Type:
// Record<string, string> (default)
// => {[key: string]: string}

import HTTP_STATUS from "~/constants/httpStatus"
import { USER_MESSAGES } from "~/constants/messages"

// Ta biết được các key trong 1 obj luôn luôn là 1 string, việc chúng ta cần làm đó chỉ là quy định kiểu value cho ErrorType mà thôi
type ErrorType = Record<string, {
  msg: string
  // location: string,
  // value: any,
  // path: string,
  [key: string]: any
}>

export class ErrorWithStatus {
  message: string
  status: number
  constructor({message, status}: {message: string; status: number}) {
    this.message = message
    this.status = status
  }
}

// Thừa kế class ErrorWithStatus
export class EntityError extends ErrorWithStatus{
  errors: ErrorType
  constructor({message = USER_MESSAGES.VALIDATION_ERROR, errors}: {message?: string, errors: ErrorType}) {
    super({message, status: HTTP_STATUS.UNPROCESSABLE_ENTITY})
    this.errors = errors
  }
}