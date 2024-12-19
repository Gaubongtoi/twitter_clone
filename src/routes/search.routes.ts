import { Router } from 'express'
import { searchController, searchHashtagsController, searchMentionsController } from '~/controllers/search.controllers'
import { searchMentionsValidation, searchValidator } from '~/middlewares/search.middlewares'
import { paginationValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidatior } from '~/middlewares/users.middlewares'
const searchRouter = Router()

/*
 * Description: Search Tweet
 * Path: /
 * Mehtod: GET
 * Header: {Authorization?: Bearer {access_token}}
 * Query: {content: string, media_type: MediaTypeQuery, people_follow: PeopleFollow, page: number, limit: number}
 *
 */
searchRouter.get(
  '/',
  accessTokenValidator,
  // verifiedUserValidatior,
  paginationValidator,
  searchValidator,
  searchController
)
/*
 * Description: Suggest Mentions
 * Path: /mentions
 * Mehtod: GET
 * Header: {Authorization?: Bearer {access_token}}
 * Query: {q: string // Not space -> trim , limit: number, page: number}
 *
 */
searchRouter.get(
  '/mentions',
  accessTokenValidator,
  // verifiedUserValidatior,
  paginationValidator,
  searchMentionsValidation,
  searchMentionsController
)

/*
 * Description: Suggest Hastags
 * Path: /hashtags
 * Mehtod: GET
 * Header: {Authorization?: Bearer {access_token}}
 * Query: {q: string // Not space -> trim , limit: number, page: number}
 */
searchRouter.get(
  '/hashtags',
  accessTokenValidator,
  // verifiedUserValidatior,
  paginationValidator,
  searchMentionsValidation,
  searchHashtagsController
)

export default searchRouter
