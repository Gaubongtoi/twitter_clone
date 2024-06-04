import User from '~/models/schema/User.schema'
import databaseService from './database.services'
import { RegisterReqBody } from '~/models/requests/User.requests'
import hashPassword from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType } from '~/constants/enums'
import RefreshToken from '~/models/schema/RefreshToken.schema'
import { ObjectId } from 'mongodb'
import { config } from 'dotenv'
// Service sẽ là folder chứa các method/function sẽ làm việc trực tiếp với database để xử lý logic nghiệp vụ - CURD
config()
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
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
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
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
      }
    })
  }
  private signEmailVerifyToken(user_id: string) {
    // SignToken này sẽ trả về 1 Promise => điều này cho phép chúng ta xử lý bất đồng bộ
    // một cách dễ dàng
    return signToken({
      payload: {
        user_id,
        type: TokenType.EmailVerifyToken
      },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: {
        expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRES_IN
      }
    })
  }
  // Method: register
  async register(payload: RegisterReqBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
    // Cú pháp databaseService.<collections trong mongoDB>.insertOne()
    await databaseService.users.insertOne(
      // Lúc này chúng ta sẽ khởi tạo 1 đối tượng User và truyền vào
      // những thuộc tính mà constructor của User định nghĩa
      new User({
        // payload: Toàn bộ req.body
        ...payload,
        _id: user_id,
        // Ghi đè lại 2 thuộc tính là date_of_birth và password
        // Convert cho cung kieu du liẹu cua RegisterReqBody (yêu cầu dữ liệu là string)
        email_verify_token,
        date_of_birth: new Date(payload.date_of_birth),
        // Hash password: decode password
        password: hashPassword(payload.password)
      })
    )
    // sau đó chúng ta sẽ đăng ký token dựa trên user_id -> identity by user_id for tokens
    // -> từ đó có thể biết được tokenAccess và tokenRefresh đó là của ai
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id.toString()),
      this.signRefreshToken(user_id.toString())
    ])
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: refresh_token
      })
    )
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
  async login(user_id: string) {
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: refresh_token
      })
    )
    return {
      access_token,
      refresh_token
    }
  }
  async logout(refresh_token: string) {
    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
    return {
      message: 'Logout success!'
    }
  }
  async updateEmailVerifyToken(user_id: string) {
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id),
      databaseService.users.updateOne(
        // Tham số thứ nhất là 1 obj filter -> tìm kiếm user bằng id
        { _id: new ObjectId(user_id) },
        // Tham số thứ hai sẽ là những bao gồm các method dùng để update
        {
          $set: {
            email_verify_token: '',
            update_at: new Date()
          }
        }
      )
    ])
    return {
      access_token,
      refresh_token
    }
  }
}

const usersService = new UsersService()
export default usersService
