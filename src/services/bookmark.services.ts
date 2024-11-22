import Bookmark from '~/models/schema/Bookmarks.schema'
import databaseService from './database.services'
import { ObjectId, WithId } from 'mongodb'
import { TweetType } from '~/constants/enums'

class BookmarkService {
  async bookmarkTweet(user_id: string, tweet_id: string) {
    const result = await databaseService.bookmarks.findOneAndUpdate(
      { user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) },
      {
        $setOnInsert: new Bookmark({
          user_id: new ObjectId(user_id),
          tweet_id: new ObjectId(tweet_id)
        })
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    )
    return result as WithId<Bookmark>
  }
  async unbookmarkTweet(user_id: string, tweet_id: string) {
    const result = await databaseService.bookmarks.findOneAndDelete({
      user_id: new ObjectId(user_id),
      tweet_id: new ObjectId(tweet_id)
    })
    return result
  }
  async getAllBookmark({ user_id, limit, page }: { user_id: string; limit: number; page: number }) {
    // Get ra được những bookmark
    const bookmarks = await databaseService.bookmarks
      .find({
        user_id: new ObjectId(user_id)
      })
      .sort({ created_at: -1 })
      .toArray()
    const tweet_id_list = bookmarks.map((bookmark) => bookmark.tweet_id as ObjectId)
    const tweets = await databaseService.tweets
      .aggregate([
        {
          $match:
            /**
             * query: The query in MQL.
             */
            {
              _id: {
                $in: tweet_id_list
              }
            }
        },
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user'
            }
        },
        {
          $unwind:
            /**
             * path: Path to the array field.
             * includeArrayIndex: Optional name for index.
             * preserveNullAndEmptyArrays: Optional
             *   toggle to unwind null and empty values.
             */
            {
              path: '$user'
            }
        },
        // {
        //   $match: /**
        //  * query: The query in MQL.
        //  */
        // {
        //   $or: [
        //     { audience: 0 },
        //     {
        //       $and: [
        //         { audience: 1 },
        //         {
        //           "user.twitter_circle": {
        //             $in: [user_id_obj]
        //           }
        //         }
        //       ]
        //     }
        //   ]
        // }
        // }
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'hashtags',
              localField: 'hashtags',
              foreignField: '_id',
              as: 'hashtags'
            }
        },
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'users',
              localField: 'mentions',
              foreignField: '_id',
              as: 'mentions'
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
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'bookmarks',
              localField: '_id',
              foreignField: 'tweet_id',
              as: 'bookmarks'
            }
        },
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'likes',
              localField: '_id',
              foreignField: 'tweet_id',
              as: 'likes'
            }
        },
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'tweet',
              localField: '_id',
              foreignField: 'parent_id',
              as: 'tweet_children'
            }
        },
        {
          $addFields:
            /**
             * newField: The new field name.
             * expression: The new field expression.
             */
            {
              comments: {
                $filter: {
                  input: '$tweet_children',
                  // Mảng các tweet con
                  as: 'child',
                  // Tên biến đại diện cho từng tweet con
                  cond: {
                    $eq: ['$$child.type', TweetType.Comment]
                  } // Lọc những tweet có type là 2 (comment)
                }
              },
              retweets: {
                $filter: {
                  input: '$tweet_children',
                  as: 'child',
                  cond: {
                    $eq: ['$$child.type', TweetType.Retweet]
                  } // Lọc những tweet có type là 1 (retweet)
                }
              },
              quote_tweets: {
                $filter: {
                  input: '$tweet_children',
                  as: 'child',
                  cond: {
                    $eq: ['$$child.type', TweetType.QuoteTweet]
                  } // Lọc những tweet có type là 3 (quote tweet)
                }
              }
            }
        },
        {
          $project:
            /**
             * specifications: The fields to
             *   include or exclude.
             */
            {
              tweet_children: 0,
              user: {
                password: 0,
                email_verify_token: 0,
                forgot_password_token: 0,
                twitter_circle: 0,
                date_of_birth: 0
              }
            }
        },
        {
          $skip: limit * (page - 1)
        },
        {
          $limit: limit
        }
      ])
      .toArray()
    const total = await databaseService.tweets
      .aggregate([
        {
          $match:
            /**
             * query: The query in MQL.
             */
            {
              _id: {
                $in: tweet_id_list
              }
            }
        },
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user'
            }
        },
        {
          $unwind:
            /**
             * path: Path to the array field.
             * includeArrayIndex: Optional name for index.
             * preserveNullAndEmptyArrays: Optional
             *   toggle to unwind null and empty values.
             */
            {
              path: '$user'
            }
        },
        // {
        //   $match: /**
        //  * query: The query in MQL.
        //  */
        // {
        //   $or: [
        //     { audience: 0 },
        //     {
        //       $and: [
        //         { audience: 1 },
        //         {
        //           "user.twitter_circle": {
        //             $in: [user_id_obj]
        //           }
        //         }
        //       ]
        //     }
        //   ]
        // }
        // }
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'hashtags',
              localField: 'hashtags',
              foreignField: '_id',
              as: 'hashtags'
            }
        },
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'users',
              localField: 'mentions',
              foreignField: '_id',
              as: 'mentions'
            }
        },
        {
          $addFields:
            /**
             * newField: The new field name.
             * expression: The new field expression.
             */
            {
              mentions: {
                $map: {
                  input: '$mentions',
                  as: 'mention',
                  in: {
                    _id: '$$mention._id',
                    name: '$$mention.name',
                    email: '$$mention.email',
                    username: '$$mention.name'
                  }
                }
              }
            }
        },
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'bookmarks',
              localField: '_id',
              foreignField: 'tweet_id',
              as: 'bookmarks'
            }
        },
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'likes',
              localField: '_id',
              foreignField: 'tweet_id',
              as: 'likes'
            }
        },
        {
          $lookup:
            /**
             * from: The target collection.
             * localField: The local join field.
             * foreignField: The target join field.
             * as: The name for the results.
             * pipeline: Optional pipeline to run on the foreign collection.
             * let: Optional variables to use in the pipeline field stages.
             */
            {
              from: 'tweet',
              localField: '_id',
              foreignField: 'parent_id',
              as: 'tweet_children'
            }
        },
        {
          $addFields:
            /**
             * newField: The new field name.
             * expression: The new field expression.
             */
            {
              comments: {
                $filter: {
                  input: '$tweet_children',
                  // Mảng các tweet con
                  as: 'child',
                  // Tên biến đại diện cho từng tweet con
                  cond: {
                    $eq: ['$$child.type', TweetType.Comment]
                  } // Lọc những tweet có type là 2 (comment)
                }
              },
              retweets: {
                $filter: {
                  input: '$tweet_children',
                  as: 'child',
                  cond: {
                    $eq: ['$$child.type', TweetType.Retweet]
                  } // Lọc những tweet có type là 1 (retweet)
                }
              },
              quote_tweets: {
                $filter: {
                  input: '$tweet_children',
                  as: 'child',
                  cond: {
                    $eq: ['$$child.type', TweetType.QuoteTweet]
                  } // Lọc những tweet có type là 3 (quote tweet)
                }
              }
            }
        },
        {
          $project:
            /**
             * specifications: The fields to
             *   include or exclude.
             */
            {
              tweet_children: 0,
              user: {
                password: 0,
                email_verify_token: 0,
                forgot_password_token: 0,
                twitter_circle: 0,
                date_of_birth: 0
              }
            }
        },
        {
          $count: 'total'
        }
      ])
      .toArray()
    return {
      tweets,
      total: total[0]?.total || 0
    }
  }
}

const bookmarkService = new BookmarkService()
export default bookmarkService
