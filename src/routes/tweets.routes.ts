import { Router } from 'express'
import { createTweetController } from '~/controllers/tweets.controllers'
import { createTweetValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidatior } from '~/middlewares/users.middlewares'
import { wrapReqHandler } from '~/utils/handlers'

const tweetsRoute = Router()

/*
 * Description: Create Tweet
 * Path: /
 * Mehtod: POST
 * Body: TweetReqBody
 */
tweetsRoute.post(
  '/',
  accessTokenValidator,
  verifiedUserValidatior,
  createTweetValidator,
  wrapReqHandler(createTweetController)
)

export default tweetsRoute
