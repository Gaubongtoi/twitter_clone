import { NextFunction, Router } from 'express'
import {
  loginController,
  logoutController,
  registerController,
  verifyEmailController
} from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  emailVerifyTokenValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator
} from '~/middlewares/users.middlewares'
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
  .post('/logout', accessTokenValidator, refreshTokenValidator, wrapReqHandler(logoutController))
  /*
   * Description: Verify Email when user client click on the link in email
   * Path: /verify-email
   * Mehtod: POST
   * Body: { email_verify_token: string}
   */
  .post('/verify-email', emailVerifyTokenValidator, wrapReqHandler(verifyEmailController))
//

export default usersRouter
