import User from '~/models/schema/User.schema'
import databaseService from './database.services'
import { RegisterReqBody } from '~/models/requests/User.requests'
import hashPassword from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType } from '~/constants/enums'

// Service xử lý việc register: Tạo thành 1 đối tượng chứa những method. Khi muỗn sử dụng method này
// chỉ cần khai báo class UsersService và .register({tham số truyền vào}) và xử lý
class UsersService {
  // Method signAccesstoken
  private signAccessToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        type: TokenType.AccessToken
      },
      options: {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN
      }
    })
  }
  private signRefreshToken(user_id: string) {
    // SignToken này sẽ trả về 1 Promise => điều này cho phép chúng ta xử lý bất đồng bộ
    // một cách dễ dàng
    return signToken({
      payload: {
        user_id,
        type: TokenType.AccessToken
      },
      options: {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
      }
    })
  }
  // Method: register
  async register(payload: RegisterReqBody) {
    // Cú pháp databaseService.<collections trong mongoDB>.insertOne()
    const result = await databaseService.users.insertOne(
      // Lúc này chúng ta sẽ khởi tạo 1 đối tượng User và truyền vào 
      // những thuộc tính mà constructor của User định nghĩa
      new User({
        // payload: Toàn bộ req.body
        ...payload,
        // Ghi đè lại 2 thuộc tính là date_of_birth và password
        // Convert cho cung kieu du liẹu cua RegisterReqBody (yêu cầu dữ liệu là string)
        date_of_birth: new Date(payload.date_of_birth),
        // Hash password: decode password
        password: hashPassword(payload.password)
      })
    )
    // Sau khi thêm vào db thành công nó sẽ trả về insertedId => ID của user
    const user_id = result.insertedId.toString()
    // sau đó chúng ta sẽ đăng ký token
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    return {
      access_token,
      refresh_token
    }
  }
  // Method: CheckisEmail
  async checkIsEmail(email: string) {
    // biến isEmail sẽ kiểm tra trong service có tồn tại email không, nếu có thì trả về id, còn nếu không thì trả về null
    const isEmail = await databaseService.users.findOne({ email })
    return Boolean(isEmail)
  }
}

const usersService = new UsersService()
export default usersService
