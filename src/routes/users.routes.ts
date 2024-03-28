import { Router } from 'express'
import { loginController } from '~/controllers/users.controllers'
import { loginValidator } from '~/middlewares/users.middlewares'
const usersRouter = Router()

// Router-level middleware:
// Method GET
usersRouter.get('/login',loginValidator, loginController)
//

export default usersRouter
