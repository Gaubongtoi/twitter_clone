import { Router } from 'express'
import {
  createTweetController,
  getNewFeedsController,
  getTweetChildrenController,
  getTweetController
} from '~/controllers/tweets.controllers'
import {
  audienceValidator,
  createTweetValidator,
  getTweetChildValidator,
  paginationValidator,
  tweetIdValidator
} from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, isUserLoggedInValidator, verifiedUserValidatior } from '~/middlewares/users.middlewares'
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

/*
 * Description: Get Tweet detail
 * Path: /:tweet_id
 * Mehtod: GET
 * Header: {Authorization?: Bearer {access_token}}
 * Param: {tweet_id: string}
 *
 */
tweetsRoute.get(
  '/:tweet_id',
  tweetIdValidator,
  isUserLoggedInValidator(accessTokenValidator),
  isUserLoggedInValidator(verifiedUserValidatior),
  audienceValidator,
  wrapReqHandler(getTweetController)
)

/*
 * Description: Get Tweet Comment (Pagination)
 * Path: /:tweet_id/children
 * Mehtod: GET
 * Header: {Authorization?: Bearer {access_token}}
 * Query: {limit: number, page: number, tweet_type: TweetType}
 */
tweetsRoute.get(
  '/:tweet_id/children',
  tweetIdValidator,
  getTweetChildValidator,
  paginationValidator,
  isUserLoggedInValidator(accessTokenValidator),
  isUserLoggedInValidator(verifiedUserValidatior),
  audienceValidator,
  wrapReqHandler(getTweetChildrenController)
)
/*
 * Description: Get New feeds (Pagination)
 * Path: /new-feeds
 * Mehtod: GET
 * Header: {Authorization?: Bearer {access_token}}
 * Query: {limit: number, page: number}
 */
tweetsRoute.get(
  '/',
  // getTweetChildValidator,
  paginationValidator,
  accessTokenValidator,
  verifiedUserValidatior,
  wrapReqHandler(getNewFeedsController)
)
export default tweetsRoute
