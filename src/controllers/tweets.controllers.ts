import { ParamsDictionary } from 'express-serve-static-core'
import { Request, Response } from 'express'
import { Pagination, TweetParams, TweetQuery, TweetReqBody } from '~/models/requests/Tweet.requests'
import tweetService from '~/services/tweets.services'
import { TokenPayload } from '~/models/requests/User.requests'
import { TweetType } from '~/constants/enums'
import Tweet from '~/models/schema/Tweets.schema'
import { ObjectId } from 'mongodb'
import HTTP_STATUS from '~/constants/httpStatus'

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
  // console.log('Ket qua:', result)
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

export const deleteTweetController = async (req: Request, res: Response) => {
  // Check Authorization Can user be delete
  const { user_id } = req.decode_authorization as TokenPayload
  if (!new ObjectId(user_id).equals(req.tweet?.user_id)) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: "You can't delete this tweet"
    })
  }
  const result = await tweetService.deleteTweet(req.tweet as Tweet)
  return res.json({
    message: result?.msg
    // result: result
  })
}

export const deleteRetweetController = async (req: Request, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload // -> Truy vấn theo user_id
  const { tweet_id } = req.params // -> Truy vấn theo parent_id
  const result = await tweetService.deleteRetweet(user_id, tweet_id)
  console.log(result)

  return res.json({
    message: result?.msg
    // result: result
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

export const getTweetByIdController = async (req: Request<TweetParams, any, any, TweetQuery>, res: Response) => {
  const { user_id } = req.query
  const current_user_id = req?.decode_authorization?.user_id
  const result = await tweetService.getTweetById({
    user_id: user_id as string,
    current_user_id: current_user_id as string,
    limit: Number(req.query.limit),
    page: Number(req.query.page)
  })
  return res.json({
    message: 'Get tweet by id successfully!',
    result,
    total_page: Math.ceil(result.total / Number(req.query.limit))
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
