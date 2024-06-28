import HTTP_STATUS from '~/constants/httpStatus'
import { NextFunction, Request, Response } from 'express'
import { omit } from 'lodash'
import { ErrorWithStatus } from '~/models/Errors'

// Error handler: err, req, res, next
export const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // console.log(err instanceof ErrorWithStatus);

  if (err instanceof ErrorWithStatus) {
    return res.status(err.status).json(omit(err, 'status'))
  }
  // Object.getOwnPropertyNames là 1 method của đối tượng Object, được sử dụng để trả về 1 mảng các tên
  // các thuộc tính (kể cả các thuộc tính không phải là enumrable)
  Object.getOwnPropertyNames(err).forEach((key) => {
    // Lọc qua mảng chứa các key là stack và message
    //
    Object.defineProperty(err, key, { enumerable: true })
  })
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: err.message,
    errInfor: omit(err, 'stack')
  })
}
