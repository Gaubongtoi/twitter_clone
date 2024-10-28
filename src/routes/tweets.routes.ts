import { Router } from 'express'
import {
  createTweetController,
  deleteRetweetController,
  deleteTweetController,
  getNewFeedsController,
  getTweetByIdController,
  getTweetChildrenController,
  getTweetController
} from '~/controllers/tweets.controllers'
import {
  audienceValidator,
  createTweetValidator,
  getTweetByIdValidator,
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
 * Description: Get Tweet detail using by userId
 * Path: /user_id=:userId
 * Mehtod: GET
 * Header: {Authorization?: Bearer {access_token}}
 * Param: {tweet_id: string}
 *
 */
tweetsRoute.get(
  '/user',
  paginationValidator,
  isUserLoggedInValidator(accessTokenValidator),
  // isUserLoggedInValidator(verifiedUserValidatior),
  getTweetByIdValidator,
  wrapReqHandler(getTweetByIdController)
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
 * Description: Delete Tweet (Comment, Retweet, Quote)
 * Path: /:tweet_id
 * Mehtod: DELETE
 * Header: {Authorization?: Bearer {access_token}} => Get ra được user_id
 * Params: {tweet_id: string}
 * Ý tưởng: Khi truyền đi trong Params -> Nếu như check xem type của Tweet đó.
 * Nếu như TweetType của nó là Tweet (type === 0) và parent_id là null thì sẽ xoá toàn bộ những children con của nó. Ngoại trừ Quote
 * Còn nếu như không thì chỉ xoá Tweet đó thôi, những tweet con vẫn sẽ được giữ lại và khi truy vấn từ parent_id thì sẽ trả về kết quả null (Ý tưởng 2) -> dễ gây ra lỗi
 * Nếu như TweetType thuộc Quote hay là Retweet, Comment (type === 3 || type === 1 || type === 2) thì khi delete phải có chứa 3 giá trị để xoá: parent_id, user_id (accessToken), tweet_id
 * Khoan hãy xoá, truy vấn tới like, bookmark có tweet_id === tweet_id , những comment có parrent_id === tweet_id và có type là 2 để xoá toàn bộ những dữ liệu có trong
 * database và trong collection tweet sẽ là cuối cùng
 *
 */
tweetsRoute.delete(
  '/remove/:tweet_id',
  tweetIdValidator,
  isUserLoggedInValidator(accessTokenValidator),
  isUserLoggedInValidator(verifiedUserValidatior),
  wrapReqHandler(deleteTweetController)
)
/*
 * Description: Delete Tweet (Comment, Retweet, Quote)
 * Path: /:tweet_id
 * Mehtod: DELETE
 * Header: {Authorization?: Bearer {access_token}} => Get ra được user_id
 * Params: {tweet_id: string}
 * Ý tưởng: đầu vào sẽ bao gồm access_token -> get ra được user_id, get được parent_id của retweet đó, và type mặc định của nó
 * sẽ là 1 (type===1) -> remove theo 3 tham số dó
 */
tweetsRoute.delete(
  '/remove/retweet/:tweet_id',
  tweetIdValidator,
  isUserLoggedInValidator(accessTokenValidator),
  isUserLoggedInValidator(verifiedUserValidatior),
  wrapReqHandler(deleteRetweetController)
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
  getTweetChildValidator,
  paginationValidator,
  isUserLoggedInValidator(accessTokenValidator),
  isUserLoggedInValidator(verifiedUserValidatior),
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
