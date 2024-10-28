import { NextFunction, Router } from 'express'
import {
  changePasswordController,
  followController,
  forgotPasswordController,
  getMeController,
  getUserController,
  loginController,
  logoutController,
  oauthController,
  recommendationController,
  refreshTokenController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  unfollowController,
  updateMeController,
  verifyEmailController,
  verifyForgotPasswordTokenController
} from '~/controllers/users.controllers'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  followValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  unfollowValidator,
  updateMeValidator,
  verifiedUserValidatior,
  verifyForgotPasswordTokenValidator
} from '~/middlewares/users.middlewares'
import { UpdateMeReqBody } from '~/models/requests/User.requests'
import { wrapReqHandler } from '~/utils/handlers'
const usersRouter = Router()

// Router-level middleware:
// Method GET
usersRouter
  /*
   * Description: Login
   * Path: /login
   * Mehtod: POST
   * Body: {email: string, password: string}
   */
  .post('/login', loginValidator, wrapReqHandler(loginController))
  /*
   * Description: Login by Google
   * Path: /login
   * Mehtod: POST
   * Body: {email: string, password: string}
   */
  .get('/oauth/google', wrapReqHandler(oauthController))
  /*
   * Description: Register a new user
   * Path: /register
   * Mehtod: POST
   * Body: {name: string, email: string, password: string,confirm_password: string (validate), date_of_birth: ISOString}
   */
  .post('/register', registerValidator, wrapReqHandler(registerController))
  /*
   * Description: Log out
   * Path: /logout
   * Mehtod: POST
   * Header: {Authorization: Bearer <access_token>}
   * Body: {refresh_token: string}
   */
  .post('/logout', refreshTokenValidator, wrapReqHandler(logoutController))
  /*
   * Description: Refresh Token
   * Path: /refresh-token
   * Mehtod: POST
   * Body: {forgot_password_token: string}
   */
  .post('/refresh-token', refreshTokenValidator, wrapReqHandler(refreshTokenController))
  /*
   * Description: Verify Email when user client click on the link in email
   * Path: /verify-email
   * Mehtod: POST
   * Body: { email_verify_token: string}
   */
  .post('/verify-email', emailVerifyTokenValidator, wrapReqHandler(verifyEmailController))
  /*
   * Description: Resend Email verify
   * Path: /resend-verify-email
   * Mehtod: POST
   * Header: {Authorization: Bearer <access_token>}
   * Body: {}
   */
  .post('/resend-verify-email', accessTokenValidator, wrapReqHandler(resendVerifyEmailController))
  /*
   * Description: Forgot Password
   * Path: /forgot-password
   * Mehtod: POST
   * Header: {}
   * Body: {email: string}
   */
  .post('/forgot-password', forgotPasswordValidator, wrapReqHandler(forgotPasswordController))
  /*
   * Description: Verify link in email to reset password
  // Sau khi post, nó sẽ kiểm tra email của mình sau khi vượt qua được validator middleware
  // thì nó sẽ tiến hành gửi đến email của mình là 1 đường dẫn redirect tới trang resetPassword
   * Path: /verify-forgot-password
   * Mehtod: POST
   * Header: {}
   * Body: {forgot_password_token: string}
   */
  .post(
    '/verify-forgot-password',
    verifyForgotPasswordTokenValidator,
    wrapReqHandler(verifyForgotPasswordTokenController)
  )
  /*
   * Description: Reset Password for user
   * Path: /reset-password
   * Mehtod: POST
   * Header: {}
   * Body: {password: string, confirm_password: string, forgot_password_token: string}
   */
  .post('/reset-password', resetPasswordValidator, wrapReqHandler(resetPasswordController))
  /*
   * Description: Get information of User
   * Path: /me
   * Mehtod: GET
   * Header: {Authorization: Bearer <access_token>}
   * Body: {}
   */
  .get('/me', accessTokenValidator, wrapReqHandler(getMeController))
  /*
   * Description: Get information of User
   * Path: /me
   * Mehtod: GET
   * Header: {Authorization: Bearer <access_token>}
   * Query: {user_id: string}
   * Body: {}
   */
  .get('/profile', accessTokenValidator, wrapReqHandler(getUserController))
  /*
   * Description: Update my profile
   * Path: /me
   * Mehtod: PATCH
   * Header: {Authorization: Bearer <access_token>}
   * Body: User Schema
   */
  .patch(
    '/me',
    accessTokenValidator,
    verifiedUserValidatior,
    updateMeValidator,
    filterMiddleware<UpdateMeReqBody>([
      'name',
      'date_of_birth',
      'bio',
      'location',
      'website',
      'username',
      'avatar',
      'cover_photo'
    ]),
    wrapReqHandler(updateMeController)
  )
  /*
   * Description: Follow someone
   * Path: /follow
   * Mehtod: POST
   * Header: {Authorization: Bearer <access_token>}
   * Body: {followed_user_id: string}
   */
  .post('/follow', accessTokenValidator, verifiedUserValidatior, followValidator, wrapReqHandler(followController))
  /*
   * Description: Unfollow someone
   * Path: /follow/user_id
   * Mehtod: POST
   * Header: {Authorization: Bearer <access_token>}
   * Body: {followed_user_id: string}
   */
  .delete('/follow/:user_id', accessTokenValidator, verifiedUserValidatior, unfollowValidator, unfollowController)
  /*
   * Description: Change Password
   * Path: /change_password
   * Mehtod: PUT
   * Header: {Authorization: Bearer <access_token>}
   * Body: {old_password: string, new_password: string, confirm_new_password: string}
   */
  .put(
    '/change_password',
    accessTokenValidator,
    verifiedUserValidatior,
    changePasswordValidator,
    wrapReqHandler(changePasswordController)
  )
  /*
   * Description: Recommendation
   * Path: /recommendations
   * Mehtod: GET
   * Header: {Authorization: Bearer <access_token>}
   */
  .get('/recommendations', accessTokenValidator, wrapReqHandler(recommendationController))
/*
 * Description: Recommendation
 * Path: /recommendations
 * Mehtod: GET
 * Header: {Authorization: Bearer <access_token>}
 */
// .get('/notification', accessTokenValidator, wrapReqHandler(getNotification))
/*
 * Description: Recommendation
 * Path: /recommendations
 * Mehtod: GET
 * Header: {Authorization: Bearer <access_token>}
 */
// .post('/notification', accessTokenValidator, wrapReqHandler(getNotification))
//

export default usersRouter
