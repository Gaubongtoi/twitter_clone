import { Router } from 'express'
import { getConservationController } from '~/controllers/conservations.controllers'
import { paginationValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, getConversationValidator, verifiedUserValidatior } from '~/middlewares/users.middlewares'
import { wrapReqHandler } from '~/utils/handlers'
const conservationsRoute = Router()

conservationsRoute.get(
  '/:receiver_id',
  paginationValidator,
  accessTokenValidator,
  verifiedUserValidatior,
  getConversationValidator,
  wrapReqHandler(getConservationController)
)

export default conservationsRoute
