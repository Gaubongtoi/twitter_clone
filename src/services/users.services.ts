// import { UserVerifyStatus } from './../constants/enums';
import User from '~/models/schema/User.schema'
import databaseService from './database.services'
import { FollowReqBody, RegisterReqBody, UpdateMeReqBody } from '~/models/requests/User.requests'
import hashPassword from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import RefreshToken from '~/models/schema/RefreshToken.schema'
import { ObjectId } from 'mongodb'
import { config } from 'dotenv'
import Followers from '~/models/schema/Followers.schema'
import axios from 'axios'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
// Service sẽ là folder chứa các method/function sẽ làm việc trực tiếp với database để xử lý logic nghiệp vụ - CURD
config()
// Service xử lý việc register: Tạo thành 1 đối tượng chứa những method. Khi muỗn sử dụng method này
// chỉ cần khai báo class UsersService và .register({tham số truyền vào}) và xử lý
class UsersService {
  // Method signAccesstoken
  private signAccessToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: {
        user_id,
        type: TokenType.AccessToken,
        verify: verify
      },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN
      }
    })
  }
  private signRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    // SignToken này sẽ trả về 1 Promise => điều này cho phép chúng ta xử lý bất đồng bộ
    // một cách dễ dàng
    return signToken({
      payload: {
        user_id,
        type: TokenType.AccessToken,
        verify: verify
      },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
      }
    })
  }
  private signEmailVerifyToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    // SignToken này sẽ trả về 1 Promise => điều này cho phép chúng ta xử lý bất đồng bộ
    // một cách dễ dàng
    return signToken({
      payload: {
        user_id,
        type: TokenType.EmailVerifyToken,
        verify: verify
      },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: {
        expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRES_IN
      }
    })
  }
  private signForgotPasswordToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    // SignToken này sẽ trả về 1 Promise => điều này cho phép chúng ta xử lý bất đồng bộ
    // một cách dễ dàng
    return signToken({
      payload: {
        user_id,
        type: TokenType.ForgotPasswordToken,
        verify: verify
      },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: {
        expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRES_IN
      }
    })
  }
  // Method: register
  async register(payload: RegisterReqBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified
    })
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
      this.signAccessToken({ user_id: user_id.toString(), verify: UserVerifyStatus.Unverified }),
      this.signRefreshToken({ user_id: user_id.toString(), verify: UserVerifyStatus.Unverified })
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
  async login({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken({ user_id: user_id.toString(), verify: verify }),
      this.signRefreshToken({ user_id: user_id.toString(), verify: verify })
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
  private async getOAuthGoogleToken(code: string) {
    // Config
    const body = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    }
    const { data } = await axios.post(`https://oauth2.googleapis.com/token`, body, {
      headers: {
        // Plugin yêu cầu của gg
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return data as {
      access_token: string
      id_token: string
    }
  }
  private async getGoogleUserInfor(access_token: string, id_token: string) {
    const { data } = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo`, {
      params: {
        access_token,
        alt: 'json'
      },
      headers: {
        Authorization: `Bearer ${id_token}`
      }
    })
    return data as {
      id: string
      email: string
      verified_email: string
      name: string
      given_name: string
      family_name: string
      picture: string
    }
  }
  async oauth(code: string) {
    const { id_token, access_token } = await this.getOAuthGoogleToken(code)
    const user_infor = await this.getGoogleUserInfor(access_token, id_token)
    if (!user_infor.verified_email) {
      throw new ErrorWithStatus({ message: 'Gmail not verified', status: HTTP_STATUS.BAD_REQUEST })
    }
    const user = await databaseService.users.findOne({ email: user_infor.email })
    if (user) {
      const [access_token, refresh_token] = await Promise.all([
        this.signAccessToken({ user_id: user._id.toString(), verify: user.verify }),
        this.signRefreshToken({ user_id: user._id.toString(), verify: user.verify })
      ])
      await databaseService.refreshTokens.insertOne(
        new RefreshToken({
          user_id: new ObjectId(user._id),
          token: refresh_token
        })
      )
      return {
        access_token,
        refresh_token,
        newUser: false
      }
    } else {
      const randomPassword = (Math.random() + 1).toString(36).substring(7)
      const data = await this.register({
        name: user_infor.name,
        email: user_infor.email,
        date_of_birth: new Date().toISOString(),
        password: randomPassword,
        confirm_password: randomPassword
      })
      return { ...data, newUser: true }
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
      this.signAccessToken({ user_id: user_id, verify: UserVerifyStatus.Verified }),
      this.signRefreshToken({ user_id: user_id, verify: UserVerifyStatus.Verified }),
      databaseService.users.updateOne(
        // Tham số thứ nhất là 1 obj filter -> tìm kiếm user bằng id
        { _id: new ObjectId(user_id) },
        // Tham số thứ hai sẽ là những bao gồm các method dùng để update
        // [{
        //   $set: {
        //     email_verify_token: '',
        //     // updated_at: "$$NOW" //MongoDB
        //     verify: UserVerifyStatus.Verified
        //   }
        // }]
        {
          $set: {
            email_verify_token: '',
            // update_at: new Date(),
            verify: UserVerifyStatus.Verified
          },
          $currentDate: {
            update_at: true // MongoDB
          }
        }
      )
    ])
    return {
      access_token,
      refresh_token
    }
  }
  async resendEmailVerify(user_id: string) {
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user_id,
      verify: UserVerifyStatus.Unverified
    })
    // Giả bộ gửi email
    console.log('Resend verify email: ', email_verify_token)
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          email_verify_token
        },
        $currentDate: {
          update_at: true
        }
      }
    )
    return {
      message: 'Resend Verify Email Success!'
    }
  }
  async forgotPassword({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    console.log(user_id)
    console.log(verify)

    const forgot_password_token = await this.signForgotPasswordToken({ user_id: user_id, verify: verify })
    const result = await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          forgot_password_token
        },
        $currentDate: {
          update_at: true
        }
      }
    )
    // console.log(result);

    return {
      message: 'Check email to reset password'
    }
  }
  async resetPassword(user_id: string, password: string) {
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          forgot_password_token: '',
          password: hashPassword(password)
        },
        $currentDate: {
          update_at: true
        }
      }
    )
    return {
      message: 'Reset Password Success!'
    }
  }
  async getMe(user_id: string) {
    const user = await databaseService.users.findOne(
      { _id: new ObjectId(user_id) },
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return user
  }
  async updateMe(user_id: string, payload: UpdateMeReqBody) {
    const payload_check = payload.date_of_birth
      ? { ...payload, date_of_birth: new Date(payload.date_of_birth) }
      : payload
    const user = await databaseService.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          ...(payload_check as UpdateMeReqBody & { date_of_birth?: Date })
        },
        $currentDate: {
          update_at: true
        }
      },
      {
        returnDocument: 'after',
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return user
  }
  async follow(user_id: string, followed_user_id: string) {
    const isFollowed = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    if (isFollowed === null) {
      await databaseService.followers.insertOne(
        new Followers({
          user_id: new ObjectId(user_id),
          followed_user_id: new ObjectId(followed_user_id)
        })
      )
      return {
        message: 'Follow success!'
      }
    }
    return {
      message: 'Have already followed!'
    }
  }
  async unfollow(user_id: string, followed_user_id: string) {
    const isFollowed = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    if (isFollowed === null) {
      return {
        message: 'Already unfollow!'
      }
    }
    await databaseService.followers.deleteOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    return {
      message: 'Unfollow Success'
    }
  }
  async changePassword(user_id: string, new_password: string) {
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          password: hashPassword(new_password)
        },
        $currentDate: {
          update_at: true
        }
      }
    )
    return {
      message: 'Change Password Success!'
    }
  }
  async refreshToken({
    user_id,
    verify,
    refresh_token
  }: {
    user_id: string
    verify: UserVerifyStatus
    refresh_token: string
  }) {
    const [new_access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken({ user_id: user_id.toString(), verify: verify }),
      this.signRefreshToken({ user_id: user_id.toString(), verify: verify })
    ])
    await databaseService.refreshTokens.deleteOne({
      token: refresh_token
    })
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: new_refresh_token
      })
    )
    return {
      access_token: new_access_token,
      refresh_token: new_refresh_token
    }
  }
}

const usersService = new UsersService()
export default usersService
