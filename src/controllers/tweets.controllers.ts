import { ParamsDictionary } from 'express-serve-static-core'
import { Request, Response } from 'express'
import { Pagination, TweetParams, TweetQuery, TweetReqBody } from '~/models/requests/Tweet.requests'
import tweetService from '~/services/tweets.services'
import { TokenPayload } from '~/models/requests/User.requests'
import { TweetType } from '~/constants/enums'

export const createTweetController = async (req: Request<ParamsDictionary, any, TweetReqBody>, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const result = await tweetService.createTweet(req.body, user_id)
  return res.json({
    message: 'Create tweet success!',
    data: result
  })
}
export const getTweetController = async (req: Request, res: Response) => {
  const result = await tweetService.increaseView(req.params.tweet_id, req.decode_authorization?.user_id)
  console.log('Ket qua:', result)
  const tweet = {
    ...req.tweet,
    guest_views: result?.guest_views,
    user_views: result?.user_views,
    updated_at: result?.updated_at
  }
  return res.json({
    message: 'Get tweet success!',
    result: tweet
  })
}

export const getTweetChildrenController = async (req: Request<TweetParams, any, any, TweetQuery>, res: Response) => {
  const { tweet, total } = await tweetService.getTweetChildren({
    tweet_id: req.params.tweet_id,
    tweet_type: Number(req.query.tweet_type) as TweetType,
    limit: Number(req.query.limit),
    page: Number(req.query.page),
    user_id: req.decode_authorization?.user_id
  })
  return res.json({
    message: 'Get tweet children success!',
    result: {
      tweet,
      total
    }
  })
}

export const getNewFeedsController = async (req: Request<ParamsDictionary, any, any, Pagination>, res: Response) => {
  // const user_id = req.decode_authorization?.user_id as string
  const result = await tweetService.getNewFeeds({
    limit: Number(req.query.limit),
    page: Number(req.query.page),
    user_id: req.decode_authorization?.user_id as string
  })
  return res.json({
    message: 'Get new feeds successfully!',
    result,
    total_page: Math.ceil(result.total / Number(req.query.limit))
  })
}
