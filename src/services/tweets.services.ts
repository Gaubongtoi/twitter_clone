import { TweetReqBody } from '~/models/requests/Tweet.requests'
import databaseService from './database.services'
import Tweet from '~/models/schema/Tweets.schema'
import { ObjectId, WithId } from 'mongodb'
import Hashtags from '~/models/schema/Hashtags.schema'

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
    console.log('hello: ', hashtags)
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
}

const tweetService = new TweetsService()
export default tweetService
