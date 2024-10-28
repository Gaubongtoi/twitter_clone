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
        // Tham số thứ nhất là một obj filter -> tìm kiếm user bằng id
        { _id: new ObjectId(user_id) },
        // Tham số thứ hai là một obj update với các method dùng để update
        {
          $set: {
            email_verify_token: '',
            verify: UserVerifyStatus.Verified
          },
          $currentDate: {
            update_at: true // MongoDB sẽ cập nhật trường này với thời gian hiện tại
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
    const user = await databaseService.users
      .aggregate([
        {
          $match:
            /**
             * query: The query in MQL.
             */
            {
              _id: new ObjectId(user_id)
            }
        },
        {
          $lookup: {
            from: 'followers', // Nối với collection follows
            localField: '_id', // ID người dùng trong collection users
            foreignField: 'user_id', // Trường follower_id trong collection follows
            as: 'followingData' // Đặt tên cho dữ liệu nối
          }
        },
        {
          $lookup: {
            from: 'users', // Nối với collection users lần nữa để lấy thông tin người được follow
            localField: 'followingData.followed_user_id', // Trường following_id từ follows
            foreignField: '_id', // Nối với _id của người dùng trong collection users
            as: 'followingUsers' // Đặt tên cho dữ liệu người dùng đã follow
          }
        },
        {
          $lookup: {
            from: 'followers', // Nối với collection follows
            localField: '_id', // ID người dùng trong collection users
            foreignField: 'followed_user_id', // Trường follower_id trong collection follows
            as: 'followedData' // Đặt tên cho dữ liệu nối
          }
        },
        {
          $lookup: {
            from: 'users', // Nối với collection users lần nữa để lấy thông tin người được follow
            localField: 'followedData.user_id', // Trường following_id từ follows
            foreignField: '_id', // Nối với _id của người dùng trong collection users
            as: 'followedUsers' // Đặt tên cho dữ liệu người dùng đã follow
          }
        },
        {
          $project: {
            password: 0,
            email_verify_token: 0,
            forgot_password_token: 0,
            followingData: 0,
            followedData: 0
          }
        }
      ])
      .toArray()

    // const user = await databaseService.users.findOne(
    //   { _id: new ObjectId(user_id) },
    //   {
    //     projection: {
    //       password: 0,
    //       email_verify_token: 0,
    //       forgot_password_token: 0
    //     }
    //   }
    // )
    return user
  }

  async getUserById(user_id: string) {
    const user = await databaseService.users
      .aggregate([
        {
          $match:
            /**
             * query: The query in MQL.
             */
            {
              _id: new ObjectId(user_id)
            }
        },
        {
          $lookup: {
            from: 'followers', // Nối với collection follows
            localField: '_id', // ID người dùng trong collection users
            foreignField: 'user_id', // Trường follower_id trong collection follows
            as: 'followingData' // Đặt tên cho dữ liệu nối
          }
        },
        {
          $lookup: {
            from: 'users', // Nối với collection users lần nữa để lấy thông tin người được follow
            localField: 'followingData.followed_user_id', // Trường following_id từ follows
            foreignField: '_id', // Nối với _id của người dùng trong collection users
            as: 'followingUsers' // Đặt tên cho dữ liệu người dùng đã follow
          }
        },
        {
          $lookup: {
            from: 'followers', // Nối với collection follows
            localField: '_id', // ID người dùng trong collection users
            foreignField: 'followed_user_id', // Trường follower_id trong collection follows
            as: 'followedData' // Đặt tên cho dữ liệu nối
          }
        },
        {
          $lookup: {
            from: 'users', // Nối với collection users lần nữa để lấy thông tin người được follow
            localField: 'followedData.user_id', // Trường following_id từ follows
            foreignField: '_id', // Nối với _id của người dùng trong collection users
            as: 'followedUsers' // Đặt tên cho dữ liệu người dùng đã follow
          }
        },
        {
          $project: {
            password: 0,
            email_verify_token: 0,
            forgot_password_token: 0,
            followingData: 0,
            followedData: 0
          }
        }
      ])
      .toArray()
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
  async recommend(user_id: string) {
    // Tìm ra những người mà currentUser đã follow
    const following = await databaseService.followers
      .find({
        user_id: new ObjectId(user_id)
      })
      .toArray()

    // Lấy ra 1 mảng chứa những user mà currentUser đó follow
    const followingIds = following.map((f) => f.followed_user_id)
    // console.log('Nhung nguoi ma dang following: ', followingIds)
    const followed = await databaseService.followers
      .find({
        followed_user_id: new ObjectId(user_id)
      })
      .toArray()

    // Lấy ra 1 mảng chứa những user mà currentUser đó được user_id followed
    const followedIds = followed.map((f) => f.user_id)
    const notFollowedBackIds = followedIds.filter((followerId) => {
      const isFollowedBack = followingIds.some((followedId) => {
        return new ObjectId(followerId).equals(new ObjectId(followedId))
      })
      // console.log('Đã theo dõi lại chưa:', isFollowedBack)
      return !isFollowedBack
    })
    // console.log('Nhung nguoi ma dang followe current user mà current user chưa follow lại: ', notFollowedBackIds)
    let followersRecommendation: any[] = []
    if (notFollowedBackIds.length > 0) {
      followersRecommendation = await databaseService.followers
        .aggregate([
          {
            // Lấy tất cả những người đang theo dõi bạn (followed_user_id = user_id)
            $match: {
              user_id: {
                $in: notFollowedBackIds
              },
              followed_user_id: new ObjectId(user_id)
            }
          },
          {
            // Join với users collection để lấy thông tin chi tiết của những người này
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'follower_info'
            }
          },
          {
            // Giải nén mảng follower_info để lấy thông tin từng user
            $unwind: '$follower_info'
          },
          {
            // Thay thế root document bằng nội dung của follower_info và thêm user_id từ followers
            $replaceRoot: {
              newRoot: {
                userId: '$user_id',
                name: '$follower_info.name',
                avatar: '$follower_info.avatar',
                username: '$follower_info.username'
              }
            }
          },
          {
            $project: {
              _id: 0,
              userId: 1,
              name: 1,
              avatar: 1,
              username: 1
            }
          }
        ])
        .toArray()
    }
    // console.log(followingIds.length)

    if (followingIds.length < 5) {
      let pushData = await databaseService.followers
        .aggregate([
          {
            $group: {
              _id: '$followed_user_id',
              followersCount: {
                $sum: 1
              }
            }
          },
          {
            $match: {
              _id: { $ne: new ObjectId(user_id) } // Loại trừ ID của người dùng hiện tại
            }
          },
          {
            $sort: { followersCount: -1 } // Sắp xếp theo số lượng followers giảm dần
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'userInfo'
            }
          },
          {
            $unwind: '$userInfo' // Lấy chi tiết user
          },
          {
            $project: {
              _id: 0, // Ẩn ID MongoDB
              userId: '$_id',
              name: '$userInfo.name',
              avatar: '$userInfo.avatar',
              username: '$userInfo.username',
              followersCount: 1
            }
          }
        ])
        .toArray()
      // console.log('pushdata: ', pushData)

      let filteredPushData = pushData.filter((user) => {
        // Kiểm tra xem user.userId có nằm trong excludedUserIds hay không\
        return !followingIds.some((excludedId) => {
          // console.log(user.userId)
          // console.log(excludedId)
          // console.log(new ObjectId(excludedId).equals(new ObjectId(user.userId as string)))
          // console.log('---------------------------')
          return new ObjectId(excludedId).equals(new ObjectId(user.userId as string))
        })
      })
      const combinedData = [...followersRecommendation, ...filteredPushData]

      // Sử dụng Map để loại bỏ trùng lặp
      const uniqueFollowersRecommendation = Array.from(
        new Map(combinedData.map((item) => [item.userId.toString(), item])).values()
      )

      // Cập nhật lại followersRecommendation
      followersRecommendation = uniqueFollowersRecommendation
    } else {
      let pushData = await databaseService.followers
        .aggregate([
          {
            // Lọc ra những document có mà user_id có trong followingIds
            // following người đó
            $match: {
              user_id: {
                $in: followingIds
              },
              // Trừ bản thân mình ra
              followed_user_id: {
                $ne: new ObjectId(user_id)
              }
            }
          },
          {
            $group: {
              _id: '$followed_user_id',
              mutualFollowers: {
                $sum: 1
              }
            }
          },
          {
            $sort: { mutualFollowers: -1 } // Sắp xếp theo số lượng người theo dõi chung (mutual followers)
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'userInfo'
            }
          },
          {
            $unwind: '$userInfo' // Lấy chi tiết user
          },
          {
            $project: {
              _id: 0, // Ẩn ID MongoDB
              userId: '$_id',
              name: '$userInfo.name',
              avatar: '$userInfo.avatar',
              bio: '$userInfo.bio',
              username: '$userInfo.username',
              mutualFollowers: 1
            }
          }
        ])
        .toArray()
      // let filteredPushData = pushData.filter((user) => {
      //   // Kiểm tra xem user.userId có nằm trong excludedUserIds hay không\
      //   return !followingIds.some((excludedId) => {
      //     // console.log(user.userId)
      //     // console.log(excludedId)
      //     // console.log(new ObjectId(excludedId).equals(new ObjectId(user.userId as string)))
      //     // console.log('---------------------------')
      //     return new ObjectId(excludedId).equals(new ObjectId(user.userId as string))
      //   })
      // })
      const combinedData = [...followersRecommendation, ...pushData]
      // Sử dụng Map để loại bỏ trùng lặp
      const uniqueFollowersRecommendation = Array.from(
        new Map(combinedData.map((item) => [item.userId.toString(), item])).values()
      )

      // Cập nhật lại followersRecommendation
      followersRecommendation = uniqueFollowersRecommendation
    }
    return {
      followersRecommendation
    }
  }
}

const usersService = new UsersService()
export default usersService
