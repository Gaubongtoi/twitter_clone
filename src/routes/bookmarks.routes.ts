import { Router } from 'express'
import {
  bookmarkTweetController,
  getAllBookmarkController,
  unbookmarkTweetController
} from '~/controllers/bookmarks.controllers'
import { paginationValidator, tweetIdValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, isUserLoggedInValidator, verifiedUserValidatior } from '~/middlewares/users.middlewares'
import { wrapReqHandler } from '~/utils/handlers'

const bookmarksRouter = Router()

/*
 * Description: Create Bookmark
 * Path: /
 * Mehtod: POST
 * Body: {tweet_id: string}
 * Header: {Authorization: 'Brearer {accessToken}'}
 */
bookmarksRouter.get(
  '/',
  accessTokenValidator,
  paginationValidator,
  isUserLoggedInValidator(accessTokenValidator),
  // verifiedUserValidatior,
  // tweetIdValidator,
  wrapReqHandler(getAllBookmarkController)
)

/*
 * Description: Create Bookmark
 * Path: /
 * Mehtod: POST
 * Body: {tweet_id: string}
 * Header: {Authorization: 'Brearer {accessToken}'}
 */
bookmarksRouter.post(
  '/',
  accessTokenValidator,
  // verifiedUserValidatior,
  tweetIdValidator,
  wrapReqHandler(bookmarkTweetController)
)
/*
 * Description: Delete Bookmark
 * Path: /:tweet_id
 * Mehtod: DELETE
 * Header: {Authorization: 'Brearer {accessToken}'}
 */
bookmarksRouter.delete(
  '/tweets/:tweet_id',
  accessTokenValidator,
  // verifiedUserValidatior,
  tweetIdValidator,
  wrapReqHandler(unbookmarkTweetController)
)

export default bookmarksRouter
