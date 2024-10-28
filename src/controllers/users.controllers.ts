import { Request, Response } from 'express'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import {
  ChangePasswordReqBody,
  FollowReqBody,
  ForgotPasswordReqBody,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayload,
  UnFollowReqParams,
  UpdateMeReqBody,
  VerifyForgotPasswordTokenReqBody
} from '~/models/requests/User.requests'
import User from '~/models/schema/User.schema'
// import { ObjectId } from 'mongodb'
import { ErrorWithStatus } from '~/models/Errors'
import databaseService from '~/services/database.services'
import { ObjectId } from 'mongodb'
import HTTP_STATUS from '~/constants/httpStatus'
import { UserVerifyStatus } from '~/constants/enums'
import { config } from 'dotenv'
config()
// Controller: chứa các file nhận request từ middleware, những file này sẽ chứa các function handler
// Đây sẽ là nơi tiếp nhận những req từ phía middleware, sau đó gọi đến service để lấy ra các method xử lý logic nghiệp vụ - CURD
// và trả về response lại cho phía client
export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  // json auto status(200)
  const user = req.user as User
  if (user && user._id) {
    const user_id = user._id
    const result = await usersService.login({ user_id: user_id.toString(), verify: user.verify })
    return res.json({
      msg: 'Login success',
      result: {
        user,
        ...result
      }
    })
  } else {
    // Xử lý trường hợp user._id không tồn tại
    throw new ErrorWithStatus({ message: 'User ID not found', status: 400 })
  }
}

export const oauthController = async (req: Request, res: Response) => {
  // Sau khi đã redirect thành công tới server với phương thức là get, thì nó sẽ gửi đến server
  // 1 url và 1 obj trong query của req
  // Trong query này, chúng ta sẽ lấy value của prop code gửi qua bên service để call API lên google https://oauth2.googleapis.com/token
  // để lấy id_token và access_token
  // + id_token là 1 mã jwt có payload chứa email, avatar, name
  // console.log('url: ', req.url)
  // /oauth/google?code=4%2F0ATx3LY7iMTwKtPVjFH9p8ylafm_gpZyVH8kGHbcoHB0Cao0wDQYdht4bhQ-xi5RDKtsfFA&scope=email+profile+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&authuser=0&prompt=consent
  // console.log('query: ', req.query)
  //   {
  //   code: '4/0ATx3LY7iMTwKtPVjFH9p8ylafm_gpZyVH8kGHbcoHB0Cao0wDQYdht4bhQ-xi5RDKtsfFA',
  //   scope: 'email profile openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  //   authuser: '0',
  //   prompt: 'consent'
  // }
  const { code } = req.query
  const result: any = await usersService.oauth(code as string)
  const urlRedirect = `${process.env.GOOGLE_CLIENT_REDIRECT_CALLBACK}?access_token=${result.access_token}&refresh_token=${result.refresh_token}&new_user=${result.newUser}`
  return res.redirect(urlRedirect)
  // return res.json({
  //   message: result.newUser ? 'Register Success!' : 'Login Success!',
  //   result: {
  //     access_token: result.access_token,
  //     refresh_token: result.refresh_token
  //   }
  // })
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response) => {
  // throw new Error('Loi roi')
  // json auto status(200)
  // Muốn cấu hình kiểu dữ liệu cho body trong req, ta tạo ra 1 thư mục models/requests/User.requests.ts
  // Sau đó khai báo biến và kiểu dữ liệu cho trường đó
  // req defautl type của nó là Request<P = core.ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = qs.ParsedQs, Locals extends Record<string, any> = Record<string, any>>
  // Chúng ta có thể modify lại cho ReqBody = any bằng interface đã được tạo ra ở models/requests/User.requests.ts
  // => req.body sẽ có kiểu dữ liệu là RegisterReqBody
  // const { email, password,  } = req.body
  const result = await usersService.register(req.body)
  return res.json({
    msg: 'Register success'
    // result
  })
}

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutReqBody>, res: Response) => {
  const { refresh_token } = req.body
  const result = await usersService.logout(refresh_token)
  // console.log(result)

  return res.json(result)
}

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response
) => {
  const { refresh_token } = req.body
  const { user_id, verify } = req.decode_refresh_token as TokenPayload
  const result = await usersService.refreshToken({ user_id, verify, refresh_token })
  return res.json({
    message: 'Refresh Token Success!',
    result: result
  })
}

export const verifyEmailController = async (req: Request, res: Response) => {
  const { user_id } = req.decode_verify_email_token as TokenPayload
  const user = await databaseService.users.findOne({
    _id: new ObjectId(user_id)
  })
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: 'User not found'
    })
  }
  // Đã verify
  if (user?.verify === UserVerifyStatus.Verified) {
    return res.status(HTTP_STATUS.OK).json({
      message: 'Email Verified!'
    })
  }

  const result = await usersService.updateEmailVerifyToken(user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: 'Email verify success!',
    result
  })
}

export const resendVerifyEmailController = async (req: Request, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  // console.log(user_id);
  if (!user_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: 'User not found!'
    })
  }
  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  if (user?.email_verify_token === '' && user?.verify === UserVerifyStatus.Verified) {
    return res.status(HTTP_STATUS.OK).json({
      message: 'Email Verified!'
    })
  }
  const result = await usersService.resendEmailVerify(user_id)
  return res.json(result)
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response
) => {
  const { _id, verify } = req.user
  const result = await usersService.forgotPassword({ user_id: (_id as ObjectId).toString(), verify: verify })
  return res.json(result)
}

export const verifyForgotPasswordTokenController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordTokenReqBody>,
  res: Response
) => {
  return res.json({
    message: 'Verify Forgot Password Success!'
  })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response
) => {
  const { user_id } = req.decode_forgot_password_token as TokenPayload
  const { password } = req.body
  const result = await usersService.resetPassword(user_id, password)
  return res.json(result)
}

export const getMeController = async (req: Request, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const user = await usersService.getMe(user_id)
  return res.json({
    message: 'Get user Success!',
    result: user[0]
  })
}

export const getUserController = async (req: Request, res: Response) => {
  const { user_id } = req.query
  const user = await usersService.getUserById(user_id as string)
  return res.json({
    message: 'Get user Success!',
    result: user[0]
  })
}

export const updateMeController = async (req: Request<ParamsDictionary, any, UpdateMeReqBody>, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const { body } = req
  const user = await usersService.updateMe(user_id, body)
  return res.json({
    message: 'Update me Success!',
    value: user
  })
}

export const followController = async (req: Request<ParamsDictionary, any, FollowReqBody>, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const { followed_user_id } = req.body
  const result = await usersService.follow(user_id, followed_user_id)
  return res.json(result)
}

export const unfollowController = async (req: Request<UnFollowReqParams>, res: Response) => {
  try {
    const { user_id } = req.decode_authorization as TokenPayload
    const { user_id: followed_user_id } = req.params
    const result = await usersService.unfollow(user_id, followed_user_id)
    return res.json(result)
  } catch (error) {
    throw new ErrorWithStatus({
      message: `Error: ${error}`,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR
    })
  }
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response
) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const { new_password } = req.body
  const result = await usersService.changePassword(user_id, new_password)
  return res.json(result)
}

export const recommendationController = async (req: Request, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const result = await usersService.recommend(user_id)
  return res.json({
    followersRecommendation: result.followersRecommendation
  })
}
