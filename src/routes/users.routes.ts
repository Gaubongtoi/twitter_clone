import { Router } from 'express'
import { loginController, registerController } from '~/controllers/users.controllers'
import { loginValidator, registerValidator } from '~/middlewares/users.middlewares'
const usersRouter = Router()

// Router-level middleware:
// Method GET
usersRouter
  .post('/login', loginValidator, loginController)
  /*
   * Description: Register a new user
   * Path: /register
   * Mehtod: POST
   * Body: {name: string, email: string, password: string,confirm_password: string (validate), date_of_birth: ISOString}
   *
   */
  .post('/register', registerValidator, registerController)
//

export default usersRouter
