import { TweetReqBody } from '~/models/requests/Tweet.requests'
import databaseService from './database.services'
import Tweet from '~/models/schema/Tweets.schema'
import { ObjectId, WithId } from 'mongodb'
import Hashtags from '~/models/schema/Hashtags.schema'
import { TweetAudience, TweetType } from '~/constants/enums'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'

class TweetsService {
  async checkAndCreateHashtag(hashtags: string[]) {
    const hashtagDocuments = await Promise.all(
      hashtags.map((hashtag) => {
        return databaseService.hashtags.findOneAndUpdate(
          { name: hashtag }, // tìm kiếm theo hashtag
          // Nếu không có
          {
            // tạo mới 1 hashtag
            $setOnInsert: new Hashtags({
              name: hashtag
            })
          },
          // Nếu có thì sẽ xuất ra 1 mảng Promise
          {
            upsert: true,
            returnDocument: 'after'
          }
        )
      })
    )
    return hashtagDocuments.map((hashtag) => (hashtag as WithId<Hashtags>)._id)
  }
  async createTweet(body: TweetReqBody, user_id: string) {
    const hashtags = await this.checkAndCreateHashtag(body.hashtags)
    // console.log('hello: ', hashtags)
    const result = await databaseService.tweets.insertOne(
      new Tweet({
        audience: body.audience,
        content: body.content,
        hashtags: hashtags,
        mentions: body.mentions,
        medias: body.medias,
        parent_id: body.parent_id,
        type: body.type,
        user_id: new ObjectId(user_id)
      })
    )
    return result
  }
  async increaseView(tweet_id: string, user_id?: string) {
    const inc = user_id ? { user_views: 1 } : { guest_views: 1 }
    const result = await databaseService.tweets.findOneAndUpdate(
      {
        _id: new ObjectId(tweet_id)
      },
      {
        $inc: inc,
        $currentDate: {
          updated_at: true
        }
      },

      {
        // Tra ve ket qua sau khi cap nhat
        returnDocument: 'after',
        // Lay ra nhung truong can thiet
        projection: {
          guest_views: 1,
          user_views: 1,
          updated_at: 1
        }
      }
    )
    // const tweetId = result?.value?._id ?? null; // Gán giá trị null nếu _id không tồn tại
    // const tweetWithUserInfo = await databaseService.tweets.aggregate([
    //   {
    //     $match: {
    //       _id: new ObjectId(result?.value?._id) // Match với document đã cập nhật
    //     }
    //   },
    //   {
    //     $lookup: {
    //       from: 'users', // Tên collection users
    //       localField: 'user_id', // Trường trong tweets để join với users
    //       foreignField: '_id', // Trường _id trong users
    //       as: 'userInfo' // Kết quả join sẽ được lưu vào userInfo
    //     }
    //   },
    //   {
    //     $unwind: '$userInfo' // Giải nén userInfo (vì mỗi tweet chỉ có 1 user)
    //   },
    //   {
    //     $project: {
    //       _id: 1, // Giữ lại ID của tweet
    //       guest_views: 1,
    //       user_views: 1,
    //       updated_at: 1,
    //       'userInfo.name': 1, // Chỉ lấy các trường cần thiết từ user
    //       'userInfo.email': 1,
    //       'userInfo.avatar': 1,
    //       'userInfo.username': 1
    //     }
    //   }
    // ]).toArray();

    return result
  }
  async getTweetChildren({
    tweet_id,
    tweet_type,
    limit,
    page,
    user_id
  }: {
    tweet_id: string
    tweet_type: TweetType
    limit: number
    page: number
    user_id?: string
  }) {
    const tweet = await databaseService.tweets
      .aggregate<Tweet>([
        {
          $match: {
            parent_id: new ObjectId(tweet_id),
            type: tweet_type
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
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
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
        {
          $project: {
            tweet_children: 0,
            user_id: 0,
            followingUsers: 0,
            followedUsers: 0,
            followingData: 0,
            followedData: 0
          }
        },
        {
          $sort: { created_at: -1 } // -1 để sắp xếp theo thứ tự giảm dần (mới nhất trước)
        },
        {
          $skip: limit * (page - 1) // Cong thuc phan trang
        },
        {
          $limit: limit
        }
      ])
      .toArray()
    const date = new Date()
    const ids = tweet.map((item) => item._id as ObjectId)
    const checked = user_id ? { user_views: 1 } : { guest_views: 1 }
    const [total] = await Promise.all([
      databaseService.tweets.countDocuments({
        parent_id: new ObjectId(tweet_id),
        type: tweet_type
      }),
      databaseService.tweets.updateMany(
        // Filter
        {
          _id: {
            // Tìm những tweet nào có id nằm trong ids
            $in: ids
          }
        },
        // Update
        {
          $inc: checked,
          $set: {
            updated_at: date
          }
        }
      )
    ])
    tweet.forEach((item) => {
      item.updated_at = date
      if (user_id) {
        item.user_views += 1
      } else {
        item.guest_views += 1
      }
    })
    return {
      tweet,
      total
    }
  }
  async getNewFeeds({ user_id, limit, page }: { user_id: string; limit: number; page: number }) {
    const user_id_obj = new ObjectId(user_id)
    const date = new Date()
    const checked = user_id ? { user_views: 1 } : { guest_views: 1 }
    // Lấy ra 1 mảng chứa tất cả những người follow của user_id đó
    // => những người follow id
    const followed_user_id = await databaseService.followers
      .find(
        {
          user_id: user_id_obj // Lấy ra những người follow của mình
        },
        {
          projection: {
            followed_user_id: 1, // Chỉ lấy giá trị followed_user_id
            _id: 0 // None
          }
        }
      )
      .toArray()
    const ids = followed_user_id.map((follow) => follow.followed_user_id) // Map lấy giá trị là 1 mảng chứa những id
    // Mong muon newfeeds se lay luon ca tweet cua minh
    ids.push(user_id_obj)
    const tweets = await databaseService.tweets
      .aggregate([
        // Lấy ra những tweets có trong những người follow mình (+ tweet của mình)
        {
          $match: {
            user_id: {
              $in: ids
            },
            // Chỉ lấy ra những Type có kiểu là TweetType.Tweet, TweetType.Retweet, TweetType.QuoteTweet
            type: { $in: [TweetType.Tweet, TweetType.Retweet, TweetType.QuoteTweet] }
          }
        },
        {
          // Truy vấn tới cho bảng users -> Lấy thông tin của người dùng
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        // Flatten mảng user ở phía trên
        {
          $unwind: {
            path: '$user'
          }
        },
        //
        {
          $match: {
            $or: [
              // thoả mãn $match
              // Audience: 0 -> Everyone
              { audience: 0 },
              // Audience: 1 -> Những người nằm trong twitter_cirlce của người follow đó mà cho phép mình
              // thấy được tweet đó
              {
                $and: [
                  { audience: 1 },
                  { user_id: user_id_obj }, // user_id từ access_token
                  { type: { $in: [TweetType.Tweet, TweetType.Retweet, TweetType.QuoteTweet] } }
                ]
              },

              // Điều kiện 3: Nếu audience là 1 và user_id khác với người hiện tại, kiểm tra user.twitter_circle
              {
                $and: [
                  { audience: 1 },
                  { user_id: { $ne: user_id_obj } }, // user_id khác với người hiện tại
                  { 'user.twitter_circle': { $in: [user_id_obj] } } // kiểm tra twitter_circle
                ]
              }
            ]
          }
        },
        // Tham chiếu lấy những thông tin của hashtag
        {
          $lookup: {
            from: 'hashtags',
            localField: 'hashtags',
            foreignField: '_id',
            as: 'hashtags'
          }
        },
        // Tham chiếu lấy những thông tin của người dùng (mentions sẽ chứa arrray ObjectID của người dùng)
        {
          $lookup: {
            from: 'users',
            localField: 'mentions',
            foreignField: '_id',
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
        // Tham chiếu tới Bookmarks collection
        {
          $lookup: {
            from: 'bookmarks',
            localField: '_id',
            foreignField: 'tweet_id',
            as: 'bookmarks'
          }
        },
        // Tham chiếu tới Likes collection
        {
          $lookup: {
            from: 'likes',
            localField: '_id',
            foreignField: 'tweet_id',
            as: 'likes'
          }
        },
        // Lấy ra những children của tweet đó
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
              // Tương tự như hàm filter -> lọc ra những giá trị thoả mãn điều kiệu trản về là TweetType.Comment
              $filter: {
                input: '$tweet_children', // Mảng các tweet con
                as: 'child', // Tên biến đại diện cho từng tweet con
                cond: { $eq: ['$$child.type', TweetType.Comment] } // Lọc những tweet có type là 2 (comment)
              }
            },
            retweets: {
              // Tương tự như hàm filter -> lọc ra những giá trị thoả mãn điều kiệu trản về là TweetType.Retweet
              $filter: {
                input: '$tweet_children',
                as: 'child',
                cond: { $eq: ['$$child.type', TweetType.Retweet] } // Lọc những tweet có type là 1 (retweet)
              }
            },
            quote_tweets: {
              // Tương tự như hàm filter -> lọc ra những giá trị thoả mãn điều kiệu trản về là TweetType.QuoteTweet
              $filter: {
                input: '$tweet_children',
                as: 'child',
                cond: { $eq: ['$$child.type', TweetType.QuoteTweet] } // Lọc những tweet có type là 3 (quote tweet)
              }
            }
          }
        },
        {
          $project: {
            tweet_children: 0,
            followedData: 0,
            followedUsers: 0,
            followingData: 0,
            followingUsers: 0,
            user: {
              password: 0,
              email_verify_token: 0,
              forgot_password_token: 0,
              twitter_circle: 0,
              date_of_birth: 0
            }
          }
        },
        // Thêm bước $sort để sắp xếp tweet từ mới nhất đến cũ nhất
        {
          $sort: { created_at: -1 } // -1 để sắp xếp theo thứ tự giảm dần (mới nhất trước)
        },
        {
          $skip: limit * (page - 1)
        },
        {
          $limit: limit
        }
      ])
      .toArray()
    const tweet_ids = tweets.map((tweet) => tweet._id as ObjectId)
    // console.log('Tweet_ids: ', tweet_ids)

    const [total] = await Promise.all([
      databaseService.tweets
        .aggregate([
          // Lấy ra những tweet match với
          {
            $match: {
              user_id: {
                $in: ids
              },
              type: { $in: [TweetType.Tweet, TweetType.Retweet, TweetType.QuoteTweet] }
            }
          },
          {
            // Tao them 1 truong moi lay thong tin cua user thong qua user_id
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
                    { audience: 1 },
                    { user_id: user_id_obj }, // user_id từ access_token
                    { type: { $in: [TweetType.Tweet, TweetType.Retweet, TweetType.QuoteTweet] } }
                  ]
                },

                // Điều kiện 3: Nếu audience là 1 và user_id khác với người hiện tại, kiểm tra user.twitter_circle
                {
                  $and: [
                    { audience: 1 },
                    { user_id: { $ne: user_id_obj } }, // user_id khác với người hiện tại
                    { 'user.twitter_circle': { $in: [user_id_obj] } } // kiểm tra twitter_circle
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
          $inc: checked,
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
      total: total[0]?.total || 0
    }
    // Người dùng có người mà đang follow dưới 5 người hoặc là tweets.length < 50
    // if (followed_user_id.length < 5 || tweets.length < 50) {
    //   const tweets_suggestions = await databaseService.tweets
    //     .aggregate([
    //       // Chỉ lấy ra những Type có kiểu là TweetType.Tweet, TweetType.Retweet, TweetType.QuoteTweet
    //       {
    //         $match: {
    //           type: { $in: [TweetType.Tweet, TweetType.Retweet, TweetType.QuoteTweet] }
    //         }
    //       },
    //       {
    //         // Truy vấn tới cho bảng users -> Lấy thông tin của người dùng
    //         $lookup: {
    //           from: 'users',
    //           localField: 'user_id',
    //           foreignField: '_id',
    //           as: 'user'
    //         }
    //       },
    //       // Flatten mảng user ở phía trên
    //       {
    //         $unwind: {
    //           path: '$user'
    //         }
    //       },
    //       //
    //       {
    //         $match: {
    //           $or: [
    //             { audience: 0 },
    //             {
    //               $and: [
    //                 { audience: 1 },
    //                 {
    //                   'user.twitter_circle': {
    //                     $in: [user_id_obj]
    //                   }
    //                 }
    //               ]
    //             }
    //           ]
    //         }
    //       },
    //       // Tham chiếu lấy những thông tin của hashtag
    //       {
    //         $lookup: {
    //           from: 'hashtags',
    //           localField: 'hashtags',
    //           foreignField: '_id',
    //           as: 'hashtags'
    //         }
    //       },
    //       // Tham chiếu lấy những thông tin của người dùng (mentions sẽ chứa arrray ObjectID của người dùng)
    //       {
    //         $lookup: {
    //           from: 'users',
    //           localField: 'mentions',
    //           foreignField: '_id',
    //           as: 'mentions'
    //         }
    //       },
    //       // Thêm 1 trường mới -> Filter lại data được tham chiếu từ user
    //       {
    //         $addFields: {
    //           mentions: {
    //             $map: {
    //               // Đầu vào sẽ là mentions field
    //               input: '$mentions',
    //               // Tương tự như map() -> mentions.map((mention))
    //               // Thì mention tương tự như 1 giá trị được map qua của mentions
    //               as: 'mention',
    //               // Lấy ra những giá trị cần thiết
    //               in: {
    //                 _id: '$$mention._id', // id
    //                 name: '$$mention.name', // name
    //                 email: '$$mention.email', // email
    //                 username: '$$mention.name' // username
    //               }
    //             }
    //           }
    //         }
    //       },
    //       // Tham chiếu tới Bookmarks collection
    //       {
    //         $lookup: {
    //           from: 'bookmarks',
    //           localField: '_id',
    //           foreignField: 'tweet_id',
    //           as: 'bookmarks'
    //         }
    //       },
    //       // Tham chiếu tới Likes collection
    //       {
    //         $lookup: {
    //           from: 'likes',
    //           localField: '_id',
    //           foreignField: 'tweet_id',
    //           as: 'likes'
    //         }
    //       },
    //       // Lấy ra những children của tweet đó
    //       {
    //         $lookup: {
    //           from: 'tweet',
    //           localField: '_id',
    //           foreignField: 'parent_id',
    //           as: 'tweet_children'
    //         }
    //       },
    //       {
    //         $addFields: {
    //           comments: {
    //             // Tương tự như hàm filter -> lọc ra những giá trị thoả mãn điều kiệu trản về là TweetType.Comment
    //             $filter: {
    //               input: '$tweet_children', // Mảng các tweet con
    //               as: 'child', // Tên biến đại diện cho từng tweet con
    //               cond: { $eq: ['$$child.type', TweetType.Comment] } // Lọc những tweet có type là 2 (comment)
    //             }
    //           },
    //           retweets: {
    //             // Tương tự như hàm filter -> lọc ra những giá trị thoả mãn điều kiệu trản về là TweetType.Retweet
    //             $filter: {
    //               input: '$tweet_children',
    //               as: 'child',
    //               cond: { $eq: ['$$child.type', TweetType.Retweet] } // Lọc những tweet có type là 1 (retweet)
    //             }
    //           },
    //           quote_tweets: {
    //             // Tương tự như hàm filter -> lọc ra những giá trị thoả mãn điều kiệu trản về là TweetType.QuoteTweet
    //             $filter: {
    //               input: '$tweet_children',
    //               as: 'child',
    //               cond: { $eq: ['$$child.type', TweetType.QuoteTweet] } // Lọc những tweet có type là 3 (quote tweet)
    //             }
    //           }
    //         }
    //       },
    //       {
    //         $addFields: {
    //           total_views: { $add: ['$user_views', '$guest_views'] } // Tạo trường tổng
    //         }
    //       },
    //       {
    //         $sort: {
    //           total_views: -1 // Sắp xếp theo tổng số lượt xem giảm dần
    //         }
    //       },
    //       {
    //         $project: {
    //           total_views: 0,
    //           tweet_children: 0,
    //           user: {
    //             password: 0,
    //             email_verify_token: 0,
    //             forgot_password_token: 0,
    //             twitter_circle: 0,
    //             date_of_birth: 0
    //           }
    //         }
    //       },
    //       {
    //         $skip: limit * (page - 1)
    //       },
    //       {
    //         $limit: limit
    //       }
    //     ])
    //     .toArray()

    //   const tweet_filter = tweets_suggestions.filter((tweet) => {
    //     console.log(tweet._id)
    //     console.log('Alo: ', !tweet_ids.some((id) => id.equals(tweet._id)))

    //     return !tweet_ids.some((id) => id.equals(tweet._id))
    //   })
    //   console.log(tweet_filter)

    //   const tweet_filter_ids = tweet_filter.map((tweet) => tweet._id)
    //   // console.log(tweet_filter_ids)

    //   const [total_suggestions] = await Promise.all([
    //     databaseService.tweets
    //       .aggregate([
    //         // Lấy ra những tweet match với
    //         {
    //           $match: {
    //             _id: { $in: [tweet_filter_ids] },
    //             type: { $in: [TweetType.Tweet, TweetType.Retweet, TweetType.QuoteTweet] }
    //           }
    //         },
    //         {
    //           // Tao them 1 truong moi lay thong tin cua user thong qua user_id
    //           $lookup: {
    //             from: 'users',
    //             localField: 'user_id',
    //             foreignField: '_id',
    //             as: 'user'
    //           }
    //         },
    //         {
    //           $unwind: {
    //             path: '$user'
    //           }
    //         },

    //         {
    //           $match: {
    //             $or: [
    //               {
    //                 audience: 0
    //               },
    //               // Điều kiện 3: Nếu audience là 1 và user_id khác với người hiện tại, kiểm tra user.twitter_circle
    //               {
    //                 $and: [
    //                   { audience: 1 },
    //                   { 'user.twitter_circle': { $in: [user_id_obj] } } // kiểm tra twitter_circle
    //                 ]
    //               }
    //             ]
    //           }
    //         },
    //         {
    //           $lookup: {
    //             from: 'hashtags',
    //             localField: 'hashtags',
    //             foreignField: '_id',
    //             as: 'hashtags'
    //           }
    //         },
    //         {
    //           $lookup: {
    //             from: 'users',
    //             localField: 'mentions',
    //             foreignField: '_id',
    //             as: 'mentions'
    //           }
    //         },
    //         {
    //           $addFields: {
    //             mentions: {
    //               $map: {
    //                 input: '$mentions',
    //                 as: 'mention',
    //                 in: {
    //                   _id: '$$mention._id',
    //                   name: '$$mention.name',
    //                   email: '$$mention.email',
    //                   username: '$$mention.name'
    //                 }
    //               }
    //             }
    //           }
    //         },
    //         {
    //           $lookup: {
    //             from: 'bookmarks',
    //             localField: '_id',
    //             foreignField: 'tweet_id',
    //             as: 'bookmarks'
    //           }
    //         },
    //         {
    //           $lookup: {
    //             from: 'likes',
    //             localField: '_id',
    //             foreignField: 'tweet_id',
    //             as: 'likes'
    //           }
    //         },
    //         {
    //           $lookup: {
    //             from: 'tweet',
    //             localField: '_id',
    //             foreignField: 'parent_id',
    //             as: 'tweet_children'
    //           }
    //         },
    //         {
    //           $addFields: {
    //             bookmarks: {
    //               $size: '$bookmarks'
    //             },
    //             likes: {
    //               $size: '$likes'
    //             },
    //             retweet_count: {
    //               $size: {
    //                 $filter: {
    //                   input: '$tweet_children',
    //                   as: 'item',
    //                   cond: {
    //                     $eq: ['$$item.type', TweetType.Retweet]
    //                   }
    //                 }
    //               }
    //             },
    //             comment_count: {
    //               $size: {
    //                 $filter: {
    //                   input: '$tweet_children',
    //                   as: 'item',
    //                   cond: {
    //                     $eq: ['$$item.type', TweetType.Comment]
    //                   }
    //                 }
    //               }
    //             },
    //             quote_count: {
    //               $size: {
    //                 $filter: {
    //                   input: '$tweet_children',
    //                   as: 'item',
    //                   cond: {
    //                     $eq: ['$$item.type', TweetType.QuoteTweet]
    //                   }
    //                 }
    //               }
    //             }
    //           }
    //         },

    //         // {
    //         //   $addFields: {
    //         //     total_views: { $add: ['$user_views', '$guest_views'] } // Tạo trường tổng
    //         //   }
    //         // },
    //         {
    //           $project: {
    //             tweet_children: 0,
    //             user: {
    //               password: 0,
    //               email_verify_token: 0,
    //               forgot_password_token: 0,
    //               twitter_circle: 0,
    //               date_of_birth: 0
    //             }
    //           }
    //         },
    //         {
    //           $count: 'total'
    //         }
    //       ])
    //       .toArray()
    //     // databaseService.tweets.updateMany(
    //     //   // Filter
    //     //   {
    //     //     _id: {
    //     //       // Tìm những tweet nào có id nằm trong ids
    //     //       $in: tweet_ids
    //     //     }
    //     //   },
    //     //   // Update
    //     //   {
    //     //     $inc: checked,
    //     //     $set: {
    //     //       updated_at: date
    //     //     }
    //     //   }
    //     // )
    //   ])
    //   // console.log(total_suggestions)

    //   return {
    //     message: [...tweets, ...tweet_filter],
    //     // aduma: total,
    //     total: total[0]?.total + total_suggestions[0]?.total || 0
    //   }
    // } else {

    //   await databaseService.tweets.updateMany(
    //     // Filter
    //     {
    //       _id: {
    //         // Tìm những tweet nào có id nằm trong ids
    //         $in: tweet_ids
    //       }
    //     },
    //     // Update
    //     {
    //       $inc: checked,
    //       $set: {
    //         updated_at: date
    //       }
    //     }
    //   )
    //   tweets.forEach((item) => {
    //     item.updated_at = date
    //     item.user_views += 1
    //   })
    //   return {
    //     tweets,
    //     total: total[0]?.total || 0
    //   }
    // }
  }
  async getTweetById({
    user_id,
    current_user_id,
    limit,
    page
  }: {
    user_id: string
    current_user_id: string
    limit: number
    page: number
  }) {
    const [tweets, totalTweetsCount] = await Promise.all([
      databaseService.tweets
        .aggregate<Tweet>([
          {
            $match: {
              user_id: new ObjectId(user_id),
              type: { $in: [TweetType.Tweet, TweetType.Retweet, TweetType.QuoteTweet] }
            }
          },
          {
            $lookup: {
              from: 'tweet',
              localField: '_id',
              foreignField: 'parent_id',
              as: 'children_tweets'
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
              // Truy vấn tới collection users
              from: 'users',
              localField: 'mentions',
              foreignField: '_id',
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
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user'
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
            $unwind: '$user'
          },
          {
            $addFields: {
              can_view: {
                $cond: {
                  if: { $eq: ['$audience', TweetAudience.EveryOne] }, // Nếu audience là 0
                  then: true, // Ai cũng có thể xem
                  else: {
                    // Nếu audience là 1, kiểm tra xem user trong accessToken có nằm trong twitter_circle hoặc chính là user_id của tweet hay không
                    $or: [
                      {
                        $in: [new ObjectId(current_user_id), '$user.twitter_circle']
                      }, // Kiểm tra người dùng có nằm trong twitter_circle
                      {
                        $eq: ['$user_id', new ObjectId(current_user_id)]
                      } // Hoặc chính là chủ của tweet
                    ]
                  }
                }
              }
            }
          },
          {
            $addFields: {
              comments: {
                $filter: {
                  input: '$children_tweets', // Mảng các tweet con
                  as: 'child', // Tên biến đại diện cho từng tweet con
                  cond: { $eq: ['$$child.type', TweetType.Comment] } // Lọc những tweet có type là 2 (comment)
                }
              },
              retweets: {
                $filter: {
                  input: '$children_tweets',
                  as: 'child',
                  cond: { $eq: ['$$child.type', TweetType.Retweet] } // Lọc những tweet có type là 1 (retweet)
                }
              },
              quote_tweets: {
                $filter: {
                  input: '$children_tweets',
                  as: 'child',
                  cond: { $eq: ['$$child.type', TweetType.QuoteTweet] } // Lọc những tweet có type là 3 (quote tweet)
                }
              }
            }
          },
          {
            // Project để định dạng output, loại bỏ các trường không cần thiết
            $project: {
              _id: 1,
              user_id: 1,
              type: 1,
              content: 1,
              audience: 1,
              parent_id: 1,
              hashtags: 1,
              mentions: 1,
              medias: 1,
              guest_views: 1,
              user_views: 1,
              created_at: 1,
              updated_at: 1,
              likes: 1,
              comments: 1,
              retweets: 1,
              quote_tweets: 1,
              user: {
                _id: 1,
                name: 1,
                email: 1,
                date_of_birth: 1,
                bio: 1,
                website: 1,
                username: 1,
                avatar: 1,
                cover_photo: 1
              },
              can_view: 1
            }
          },
          {
            $sort: { created_at: -1 } // -1 để sắp xếp theo thứ tự giảm dần (mới nhất trước)
          },
          {
            $skip: limit * (page - 1)
          },
          {
            $limit: limit
          }
        ])
        .toArray(),
      databaseService.tweets
        .aggregate([
          {
            $match: {
              user_id: new ObjectId(user_id),
              type: { $in: [TweetType.Tweet, TweetType.Retweet, TweetType.QuoteTweet] }
            }
          },
          {
            $count: 'total'
          }
        ])
        .toArray()
    ])
    if (!tweets) {
      return {
        tweets: [],
        total: 0
      }
    }
    return {
      tweets,
      total: totalTweetsCount[0]?.total || 0
    }
  }
  async deleteTweet(tweet: Tweet) {
    // await databaseService.tweets.deleteOne({
    //   _id: new ObjectId(tweet_id)
    // })
    // TH 1: Nếu như TweetType của nó là Tweet (type === 0) và parent_id là null -> xoá toàn bộ những tweet con, chỉ trừ Quote
    await Promise.all([
      // Remove Likes
      databaseService.likes.deleteMany({
        tweet_id: new ObjectId(tweet._id)
      }),
      // Remove Bookmarks
      databaseService.bookmarks.deleteMany({
        tweet_id: new ObjectId(tweet._id)
      }),
      // Remove Comments
      databaseService.tweets.deleteMany({
        type: TweetType.Comment,
        parent_id: tweet._id
      }),
      // Remove Retweet
      databaseService.tweets.deleteMany({
        type: TweetType.Retweet,
        parent_id: tweet._id
      }),
      // Remove Tweets
      databaseService.tweets.deleteOne({
        _id: tweet._id
      })
    ])
    return {
      msg: 'Delete Success!'
    }
  }
  async deleteRetweet(user_id: string, tweet_id: string) {
    const retweet = await databaseService.tweets.findOne({
      parent_id: new ObjectId(tweet_id),
      user_id: new ObjectId(user_id),
      type: TweetType.Retweet
    })
    await Promise.all([
      databaseService.likes.deleteMany({
        tweet_id: new ObjectId(retweet?._id)
      }),
      // Remove Bookmarks
      databaseService.bookmarks.deleteMany({
        tweet_id: new ObjectId(retweet?._id)
      }),
      // Remove Comments
      databaseService.tweets.deleteMany({
        type: 2,
        parent_id: retweet?._id
      }),
      // Remove Tweets
      databaseService.tweets.deleteOne({
        _id: retweet?._id
      })
    ])
    // console.log(retweet)
    return {
      msg: 'Delete retweet Success!'
    }
  }
}

const tweetService = new TweetsService()
export default tweetService
