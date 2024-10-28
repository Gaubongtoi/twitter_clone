import { ParamsDictionary } from 'express-serve-static-core'
import { Request, Response } from 'express'
import { TokenPayload } from '~/models/requests/User.requests'
import likeService from '~/services/likes.services'
import LikeReqBody from '~/models/requests/Like.requests'

export const likeTweetController = async (req: Request<ParamsDictionary, any, LikeReqBody>, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const { tweet_id } = req.body
  const result = await likeService.createLike(user_id, tweet_id)
  return res.json({
    message: 'Like successfully!',
    result
  })
}

export const unlikeTweetController = async (req: Request<ParamsDictionary, any, LikeReqBody>, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const { tweet_id } = req.params
  const result = await likeService.removeLike(user_id, tweet_id)
  return res.json({
    message: 'Unlike successfully!',
    result
  })
}
