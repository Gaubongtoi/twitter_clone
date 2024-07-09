import { ParamsDictionary } from 'express-serve-static-core'
import { Request, Response } from 'express'
import BookmarkReqBody from '~/models/requests/Bookmark.requests'
import bookmarkService from '~/services/bookmark.services'
import { TokenPayload } from '~/models/requests/User.requests'

export const bookmarkTweetController = async (req: Request<ParamsDictionary, any, BookmarkReqBody>, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const { tweet_id } = req.body
  const result = await bookmarkService.bookmarkTweet(user_id, tweet_id)
  return res.json({
    message: 'Bookmark Success!',
    result
  })
}

export const unbookmarkTweetController = async (req: Request, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const { tweet_id } = req.params
  await bookmarkService.unbookmarkTweet(user_id, tweet_id)
  return res.json({
    message: 'Unbookmark Success!'
  })
}
