import { SearchQuery } from '~/models/requests/Search.requests'
import databaseService from './database.services'
import { ObjectId } from 'mongodb'
import { MediaType, MediaTypeQuery, PeopleFollow, TweetType } from '~/constants/enums'

class SearchService {
  async search({
    content,
    page,
    limit,
    user_id,
    media_type,
    people_follow
  }: {
    content: string
    page: number
    limit: number
    user_id: string
    media_type?: MediaTypeQuery
    people_follow?: PeopleFollow
  }) {
    // const result = await
    const match: any = {
      $text: {
        $search: content
      }
    }
    if (media_type) {
      if (media_type === MediaTypeQuery.Image) {
        match['medias.type'] = MediaType.Image
      }
      if (media_type === MediaTypeQuery.Video) {
        match['medias.type'] = {
          $in: [MediaType.Video, MediaType.HLS]
        }
      }
    }
    if (people_follow && people_follow === '1') {
      const user_id_obj = new ObjectId(user_id)
      // Lấy ra 1 mảng chứa tất cả những người follow của user_id đó
      // => những người follow id
      const followed_user_id = await databaseService.followers
        .find(
          {
            user_id: user_id_obj
          },
          {
            projection: {
              followed_user_id: 1,
              _id: 0
            }
          }
        )
        .toArray()
      const ids = followed_user_id.map((follow) => follow.followed_user_id)
      // Mong muon newfeeds se lay luon ca tweet cua minh
      ids.push(user_id_obj)
      match['user_id'] = {
        $in: ids
      }
    }
    const tweets = await databaseService.tweets
      .aggregate([
        {
          $match: match
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: {
            path: '$user'
          }
        },
        {
          $match: {
            $or: [
              {
                audience: 0
              },
              {
                $and: [
                  {
                    audience: 1
                  },
                  {
                    'user.twitter_circle': {
                      $in: [new ObjectId(user_id)]
                    }
                  }
                ]
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'hashtags',
            localField: 'hashtags',
            foreignField: '_id',
            as: 'hashtags'
          }
        },
        {
          $lookup: {
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
                  username: '$$mention.name'
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
            bookmarks: {
              $size: '$bookmarks'
            },
            likes: {
              $size: '$likes'
            },
            retweet_count: {
              $size: {
                $filter: {
                  input: '$tweet_children',
                  as: 'item',
                  cond: {
                    $eq: ['$$item.type', TweetType.Retweet]
                  }
                }
              }
            },
            comment_count: {
              $size: {
                $filter: {
                  input: '$tweet_children',
                  as: 'item',
                  cond: {
                    $eq: ['$$item.type', TweetType.Comment]
                  }
                }
              }
            },
            quote_count: {
              $size: {
                $filter: {
                  input: '$tweet_children',
                  as: 'item',
                  cond: {
                    $eq: ['$$item.type', TweetType.QuoteTweet]
                  }
                }
              }
            }
          }
        },
        {
          $project: {
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
          $skip: limit * (page - 1) // Cong thuc phan trang
        },
        {
          $limit: limit
        }
      ])
      .toArray()
    const tweet_ids = tweets.map((tweet) => tweet._id as ObjectId)
    const date = new Date()
    const [total] = await Promise.all([
      databaseService.tweets
        .aggregate([
          {
            $match: match
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          {
            $unwind: {
              path: '$user'
            }
          },
          {
            $match: {
              $or: [
                {
                  audience: 0
                },
                {
                  $and: [
                    {
                      audience: 1
                    },
                    {
                      'user.twitter_circle': {
                        $in: [new ObjectId(user_id)]
                      }
                    }
                  ]
                }
              ]
            }
          },
          {
            $count: 'total'
          }
        ])
        .toArray(),
      databaseService.tweets.updateMany(
        // Filter
        {
          _id: {
            // Tìm những tweet nào có id nằm trong ids
            $in: tweet_ids
          }
        },
        // Update
        {
          $inc: { user_views: 1 },
          $set: {
            updated_at: date
          }
        }
      )
    ])
    tweets.forEach((item) => {
      item.updated_at = date
      item.user_views += 1
    })
    return {
      tweets,
      total: total[0]?.total !== undefined ? total[0].total : 0
    }
  }
  async searchMentions({ q, page, limit, user_id }: { q: string; page: number; limit: number; user_id: string }) {
    const users = await databaseService.users
      .find({
        $or: [
          {
            username: {
              $regex: `.*${q}.*`, // Tìm kiếm `q` ở bất kỳ đâu trong username
              $options: 'i' // Không phân biệt chữ hoa/thường
            }
          },
          {
            name: {
              $regex: `.*${q}.*`, // Tìm kiếm `q` ở bất kỳ đâu trong tên
              $options: 'i' // Không phân biệt chữ hoa/thường
            }
          }
        ]
      })
      .skip((page - 1) * limit) // Bỏ qua số tài liệu
      .limit(limit) // Giới hạn số tài liệu trả về
      .toArray()
    const total = await databaseService.users.countDocuments({
      $or: [
        {
          username: {
            $regex: `.*${q}.*`, // Tìm kiếm `q` ở bất kỳ đâu trong username
            $options: 'i' // Không phân biệt chữ hoa/thường
          }
        },
        {
          name: {
            $regex: `.*${q}.*`, // Tìm kiếm `q` ở bất kỳ đâu trong tên
            $options: 'i' // Không phân biệt chữ hoa/thường
          }
        }
      ]
    })
    return {
      users,
      total
    }
  }
  async searchHashtags({ q, page, limit, user_id }: { q: string; limit: number; page: number; user_id: string }) {
    const hashtags = await databaseService.hashtags
      .find({
        name: {
          $regex: `.*${q}.*`, // Tìm kiếm `q` ở bất kỳ đâu trong username
          $options: 'i' // Không phân biệt chữ hoa/thường
        }
      })
      .skip((page - 1) * limit) // Bỏ qua số tài liệu
      .limit(limit) // Giới hạn số tài liệu trả về
      .toArray()
    const total = await databaseService.hashtags.countDocuments({
      name: {
        $regex: `.*${q}.*`, // Tìm kiếm `q` ở bất kỳ đâu trong username
        $options: 'i' // Không phân biệt chữ hoa/thường
      }
    })
    return {
      hashtags,
      total
    }
  }
}

const searchService = new SearchService()
export default searchService
