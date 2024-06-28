import { Router } from 'express'
import { bookmarkTweetController, unbookmarkTweetController } from '~/controllers/bookmarks.controllers'
import { accessTokenValidator, verifiedUserValidatior } from '~/middlewares/users.middlewares'
import { wrapReqHandler } from '~/utils/handlers'

const bookmarksRouter = Router()

/*
 * Description: Create Bookmark
 * Path: /
 * Mehtod: POST
 * Body: {tweet_id: string}
 * Header: {Authorization: 'Brearer {accessToken}'}
 */
bookmarksRouter.post('/', accessTokenValidator, verifiedUserValidatior, wrapReqHandler(bookmarkTweetController))
/*
 * Description: Delete Bookmark
 * Path: /:tweet_id
 * Mehtod: DELETE
 * Header: {Authorization: 'Brearer {accessToken}'}
 */
bookmarksRouter.delete('/tweets/:tweet_id', accessTokenValidator, verifiedUserValidatior, wrapReqHandler(unbookmarkTweetController))

export default bookmarksRouter
