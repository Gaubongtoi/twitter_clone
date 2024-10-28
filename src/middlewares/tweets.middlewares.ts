import { validate } from '~/utils/validation'
import { checkSchema } from 'express-validator'
import { MediaType, TweetAudience, TweetType, UserVerifyStatus } from '~/constants/enums'
import { numberEnumToArray } from '~/utils/common'
import { ObjectId } from 'mongodb'
import { isEmpty } from 'lodash'
import databaseService from '~/services/database.services'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { NextFunction, Request, Response } from 'express'
import Tweet from '~/models/schema/Tweets.schema'
import { TokenPayload } from '~/models/requests/User.requests'
import { wrapReqHandler } from '~/utils/handlers'
const tweetTypes = numberEnumToArray(TweetType)
const audienceTypes = numberEnumToArray(TweetAudience)
const mediaTypes = numberEnumToArray(MediaType)

export const createTweetValidator = validate(
  checkSchema({
    type: {
      isIn: {
        // Check type với 1 mảng đã được định nghĩa và kiểm tra value đầu vào có nằm trong đó hay không
        options: [tweetTypes],
        // Nếu không sẽ xuất ra lỗi
        errorMessage: 'Invalid Types of Tweet'
      }
    },
    audience: {
      // Tương tự
      isIn: {
        options: [audienceTypes],
        errorMessage: 'Invalid Types of Audience'
      }
    },
    parent_id: {
      custom: {
        options: (value, { req }) => {
          // Nếu field 'type' là retweet, comment, quotetweet thì 'parent_id' phải là tweet_id của tweet cha
          // Nếu field 'type' là tweet thì 'parent_id' sẽ là null
          const type = req.body.type as TweetType // Lấy ra type được gửi kèm trong body
          // Nếu trong mảng này có chứa kiểu type và value có hợp lệ với quy chuẩn của ObjectId do mongo quy định hay không
          if ([TweetType.Retweet, TweetType.Comment, TweetType.QuoteTweet].includes(type) && !ObjectId.isValid(value)) {
            throw new Error('Parent_id must be a valid tweet_id')
          }
          // Check value
          if (type === TweetType.Tweet && value !== null) {
            throw new Error('Parent_id must be null')
          }
          return true
        }
      }
    },
    content: {
      custom: {
        // Nếu type là retweet thì 'content' phải là '1 chuỗi rỗng', nếu type là comment, quotetweet, tweet và không có mentions: @tags
        // và hashtags: #hashtags thì content phải là string và không được rỗng
        options: (value, { req }) => {
          const type = req.body.type as TweetType
          const hashtags = req.body.hashtags as string[]
          const mentions = req.body.mentions as string[]
          // if (
          //   [TweetType.Comment, TweetType.QuoteTweet, TweetType.Tweet].includes(type) &&
          //   isEmpty(hashtags) && // check arr isEmpty
          //   isEmpty(mentions) && // check arr isEmpty
          //   value === '' // content truyền vào phải là 1 chuỗi và không được rỗng
          // ) {
          //   console.log(value === '')

          //   throw new Error('Content must be a non empty string')
          // }
          if (type === TweetType.Retweet && Boolean(value)) {
            throw new Error('Content must be null')
          }
          return true
        }
      }
    },
    hashtags: {
      isArray: true,
      custom: {
        options: (value, { req }) => {
          // Yêu cầu mỗi phần tử trong arr là string
          if (!value.every((item: any) => typeof item === 'string')) {
            throw new Error('Hashtags must be an array of string')
          }
          return true
        }
      }
    },
    mentions: {
      isArray: true,
      custom: {
        options: (value, { req }) => {
          // Yêu cầu mỗi phần tử trong arr là user_id
          if (!value.every((item: any) => ObjectId.isValid(item))) {
            throw new Error('Mentions must be an array of user_id ObjectId MongoDB')
          }
          return true
        }
      }
    },
    medias: {
      isArray: true
      // custom: {
      //   // Media cần phải gửi lên server 1 mảng
      //   options: (value, { req }) => {
      //     if (value.some((item: any) => typeof item.url !== 'string' || typeof !mediaTypes.includes(item.type))) {
      //       throw new Error('Media must be an array of media object')
      //     }
      //     return true
      //   }
      // }
    }
  })
)

export const tweetIdValidator = validate(
  checkSchema(
    {
      tweet_id: {
        custom: {
          options: async (value, { req }) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: 'Tweet ID is not valid',
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            const [tweet] = await databaseService.tweets
              .aggregate<Tweet>([
                {
                  // Lọc những tweet có _id là value (tweet_id: req)
                  $match: {
                    _id: new ObjectId(value as string)
                  }
                },
                {
                  // Query
                  $lookup: {
                    // Truy vấn tới collection hashtags
                    from: 'hashtags',
                    // Trường nào để tham chiếu ở tweet
                    localField: 'hashtags',
                    // Lấy trường ở trên tham chiếu với trường _id ở collection hashtags
                    foreignField: '_id',
                    // Đặt tên là hashtags
                    as: 'hashtags'
                  }
                },
                {
                  $lookup: {
                    // Truy vấn tới collection users
                    from: 'users',
                    // Lấy trường mentions ở collection tweet
                    localField: 'user_id',
                    // Lấy trường đó để tham chiếu với _id ở user => Lấy ra 1 mảng chứa những obj user
                    foreignField: '_id',
                    // Đặt tên
                    as: 'user'
                  }
                },
                {
                  $unwind: '$user'
                },
                {
                  $lookup: {
                    // Truy vấn tới collection users
                    from: 'users',
                    // Lấy trường mentions ở collection tweet
                    localField: 'mentions',
                    // Lấy trường đó để tham chiếu với _id ở user => Lấy ra 1 mảng chứa những obj user
                    foreignField: '_id',
                    // Đặt tên
                    as: 'mentions'
                  }
                },

                {
                  $lookup: {
                    from: 'followers',
                    localField: 'mentions._id',
                    foreignField: 'user_id',
                    as: 'followingData'
                  }
                },
                {
                  $lookup: {
                    from: 'users',
                    localField: 'followingData.followed_user_id',
                    foreignField: '_id',
                    as: 'followingUsers'
                  }
                },
                {
                  $lookup: {
                    from: 'followers',
                    localField: 'mentions._id',
                    foreignField: 'followed_user_id',
                    as: 'followedData'
                  }
                },
                {
                  $lookup: {
                    from: 'users',
                    localField: 'followedData.user_id',
                    foreignField: '_id',
                    as: 'followedUsers'
                  }
                },
                {
                  $addFields: {
                    mentions: {
                      $map: {
                        input: '$mentions',
                        as: 'mention',
                        in: {
                          _id: '$$mention._id',
                          name: '$$mention.name',
                          email: '$$mention.email',
                          username: '$$mention.username',
                          bio: '$$mention.bio',
                          cover_photo: '$$mention.cover_photo',
                          avatar: '$$mention.avatar',
                          followingUsers: '$followingUsers',
                          // Thêm toàn bộ mảng followingUsers
                          followedUsers: '$followedUsers' // Thêm toàn bộ mảng followedUsers
                        }
                      }
                    }
                  }
                },
                {
                  $lookup: {
                    from: 'bookmarks',
                    localField: '_id',
                    foreignField: 'tweet_id',
                    as: 'bookmarks'
                  }
                },
                {
                  $lookup: {
                    from: 'likes',
                    localField: '_id',
                    foreignField: 'tweet_id',
                    as: 'likes'
                  }
                },
                {
                  $lookup: {
                    from: 'tweet',
                    localField: '_id',
                    foreignField: 'parent_id',
                    as: 'tweet_children'
                  }
                },
                {
                  $addFields: {
                    comments: {
                      $filter: {
                        input: '$tweet_children', // Mảng các tweet con
                        as: 'child', // Tên biến đại diện cho từng tweet con
                        cond: { $eq: ['$$child.type', TweetType.Comment] } // Lọc những tweet có type là 2 (comment)
                      }
                    },
                    retweets: {
                      $filter: {
                        input: '$tweet_children',
                        as: 'child',
                        cond: { $eq: ['$$child.type', TweetType.Retweet] } // Lọc những tweet có type là 1 (retweet)
                      }
                    },
                    quote_tweets: {
                      $filter: {
                        input: '$tweet_children',
                        as: 'child',
                        cond: { $eq: ['$$child.type', TweetType.QuoteTweet] } // Lọc những tweet có type là 3 (quote tweet)
                      }
                    }
                  }
                },
                // {
                //   $addFields: {
                //     bookmarks: {
                //       $size: '$bookmarks'
                //     },
                //     likes: {
                //       $size: '$likes'
                //     },
                //     retweet_count: {
                //       $size: {
                //         $filter: {
                //           input: '$tweet_children',
                //           as: 'item',
                //           cond: {
                //             $eq: ['$$item.type', TweetType.Retweet]
                //           }
                //         }
                //       }
                //     },
                //     comment_count: {
                //       $size: {
                //         $filter: {
                //           input: '$tweet_children',
                //           as: 'item',
                //           cond: {
                //             $eq: ['$$item.type', TweetType.Comment]
                //           }
                //         }
                //       }
                //     },
                //     quote_count: {
                //       $size: {
                //         $filter: {
                //           input: '$tweet_children',
                //           as: 'item',
                //           cond: {
                //             $eq: ['$$item.type', TweetType.QuoteTweet]
                //           }
                //         }
                //       }
                //     }
                //   }
                // },
                {
                  $project: {
                    tweet_children: 0,
                    followedData: 0,
                    followedUsers: 0,
                    followingData: 0,
                    followingUsers: 0
                  }
                }
              ])
              .toArray()
            if (!tweet) {
              throw new ErrorWithStatus({ message: 'Tweet not found!', status: HTTP_STATUS.NOT_FOUND })
            }
            ;(req as Request).tweet = tweet
            return true
          }
        }
      }
    },
    ['params', 'body']
  )
)

export const getTweetChildValidator = validate(
  checkSchema(
    {
      tweet_type: {
        isIn: {
          // Check type với 1 mảng đã được định nghĩa và kiểm tra value đầu vào có nằm trong đó hay không
          options: [tweetTypes],
          // Nếu không sẽ xuất ra lỗi
          errorMessage: 'Invalid Types of Tweet'
        }
      }
    },
    ['query']
  )
)

export const paginationValidator = validate(
  checkSchema(
    {
      limit: {
        isNumeric: true,
        custom: {
          options: async (value, { req }) => {
            const num = Number(value)
            if (num > 100 || num < 1) {
              throw new Error('Maximum of limit is 100')
            }
            return true
          }
        }
      },
      page: {
        isNumeric: true,
        custom: {
          options: async (value, { req }) => {
            const num = Number(value)
            if (num < 1) {
              throw new Error('Page > 0')
            }
            return true
          }
        }
      }
    },
    ['query']
  )
)

export const audienceValidator = wrapReqHandler(async (req: Request, res: Response, next: NextFunction) => {
  const tweet = req.tweet as Tweet
  // Kiểm tra trạng thái của tweet là pulbic hay là circle
  if (tweet.audience === TweetAudience.TwitterCircle) {
    // Kiểm tra người xem tweet này đã đăng nhập hay chưa
    if (!req.decode_authorization) {
      throw new ErrorWithStatus({
        message: 'Access Token is required!',
        status: HTTP_STATUS.UNAUTHORIZED
      })
    }
    // Kiểm tra tài khoản của khán giả (khoá hoặc bị xoá)
    const author = await databaseService.users.findOne({
      _id: new ObjectId(tweet.user_id)
    })
    if (!author || author.verify === UserVerifyStatus.Banned) {
      throw new ErrorWithStatus({
        message: 'User not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }
    // Kiểm tra xem người khán giả đăng nhập bên phía client có nằm trong Tweet Circle hay không
    const { user_id } = req.decode_authorization as TokenPayload
    const isExistInCircle = author?.twitter_circle.some((user_circle_id) => user_circle_id.equals(user_id))
    // Đồng thời check xem mình có phải là tác giả hay không
    if (!isExistInCircle && !author._id.equals(user_id)) {
      throw new ErrorWithStatus({
        message: 'Tweet is not public',
        status: HTTP_STATUS.FORBIDDEN
      })
    }
  }
  next()
})

export const getTweetByIdValidator = validate(
  checkSchema(
    {
      user_id: {
        custom: {
          options: async (value, { req }) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: 'User ID is not valid',
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            return true
          }
        }
      }
    },
    ['query']
  )
)
