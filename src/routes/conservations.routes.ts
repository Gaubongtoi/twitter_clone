import { Router } from 'express'
import { getConservationController, getReceiversController } from '~/controllers/conservations.controllers'
import { paginationValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, getConversationValidator, verifiedUserValidatior } from '~/middlewares/users.middlewares'
import { wrapReqHandler } from '~/utils/handlers'
const conservationsRoute = Router()

/*
 * Description: Get all receivers
 * Path: /receivers
 * Mehtod: GET
 * Header: {Authorization: access_token: string}
 * Query: {page: number; limit: number}
 */
conservationsRoute.get(
  '/receivers',
  paginationValidator,
  accessTokenValidator,
  verifiedUserValidatior,
  wrapReqHandler(getReceiversController)
)

/*
 * Description: Get conservation of user
 * Path: /:receiver_id
 * Mehtod: GET
 * Header: {Authorization: access_token: string}
 * Params: {receiver_id: string}
 * Query: {page: number; limit: number}
 */
conservationsRoute.get(
  '/',
  paginationValidator,
  accessTokenValidator,
  verifiedUserValidatior,
  getConversationValidator,
  wrapReqHandler(getConservationController)
)

export default conservationsRoute
