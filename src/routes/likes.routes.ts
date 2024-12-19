import { Router } from 'express'
import { likeTweetController, unlikeTweetController } from '~/controllers/likes.controllers'
import { tweetIdValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidatior } from '~/middlewares/users.middlewares'
import { wrapReqHandler } from '~/utils/handlers'

const likesRouter = Router()
/*
 * Description: Create Like
 * Path: /
 * Mehtod: POST
 * Body: {tweet_id: string}
 * Header: {Authorization: 'Brearer {accessToken}'}
 */
likesRouter.post(
  '/',
  accessTokenValidator,
  // verifiedUserValidatior,
  tweetIdValidator,
  wrapReqHandler(likeTweetController)
)
/*
 * Description: Remove Like of tweet
 * Path: '/tweets/:tweet_id'
 * Mehtod: DELETE
 * Header: {Authorization: 'Brearer {accessToken}'}
 */
likesRouter.delete(
  '/tweets/:tweet_id',
  accessTokenValidator,
  // verifiedUserValidatior,
  tweetIdValidator,
  wrapReqHandler(unlikeTweetController)
)
export default likesRouter
