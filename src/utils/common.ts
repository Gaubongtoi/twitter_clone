import { Request } from 'express'
import { ErrorWithStatus } from '~/models/Errors'
import { verifyToken } from './jwt'
import { capitalize } from 'lodash'
import { JsonWebTokenError } from 'jsonwebtoken'
import HTTP_STATUS from '~/constants/httpStatus'

// Hàm này sẽ là hàm biến hàm enum thành 1 array để tiện cho việc validator isIn của expressJS
export const numberEnumToArray = (numberEnum: { [key: string]: string | number }) => {
  // Cấu hình cho key có kiểu là string và value có kiểu là string or number
  // Object.values: Lấy ra toàn bộ value trong obj đó và tập hợp lại thành 1 mảng
  // .filter: check xem trong arr value đó nếu đúng với điều kiện được return, nó sẽ thêm vào 1 mảng => check typeof
  // as number[]: để chắc chắn hơn hàm trả về sẽ toàn là 1 mảng kiểu number
  return Object.values(numberEnum).filter((value) => typeof value === 'number') as number[]
}

export const verifyAccessToken = async (access_token: string, req?: Request) => {
  // Kiểm tra 1 lần nữa cho chắc:))
  // console.log(access_token);
  if (access_token === undefined) {
    throw new ErrorWithStatus({ message: 'AccessToken is required!', status: HTTP_STATUS.UNAUTHORIZED }) // -> error.middleware
  }
  try {
    const decode_authorization = await verifyToken({
      token: access_token,
      secretOnPublicKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
    })
    if (req) {
      ;(req as Request).decode_authorization = decode_authorization
      return true
    }
    return decode_authorization
  } catch (error) {
    throw new ErrorWithStatus({
      message: capitalize((error as JsonWebTokenError).message),
      status: HTTP_STATUS.UNAUTHORIZED
    })
  }
}
