import { MongoClient, ServerApiVersion, Db, Collection } from 'mongodb'
import { config } from 'dotenv'
import User from '~/models/schema/User.schema'
import RefreshToken from '~/models/schema/RefreshToken.schema'
import Followers from '~/models/schema/Followers.schema'
import Tweet from '~/models/schema/Tweets.schema'
import Hashtags from '~/models/schema/Hashtags.schema'
import Bookmark from '~/models/schema/Bookmarks.schema'
import Likes from '~/models/schema/Likes.schema'
import Conservations from '~/models/schema/Conversations.schema'
import Notification from '~/models/schema/Notifications.schema'
config()
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@practicemongo.ltrx9ag.mongodb.net/?retryWrites=true&w=majority&appName=PracticeMongo`
class DatabaseService {
  private client: MongoClient
  private db: Db
  constructor() {
    // Create a MongoClient with a MongoClientOptions object to set the Stable API version
    this.client = new MongoClient(uri)
    this.db = this.client.db(process.env.DB_NAME)
  }
  async indexTweets() {
    const exists = await this.tweets.indexExists(['content_text'])
    if (!exists) {
      this.tweets.createIndex({ content: 'text' }, { default_language: 'none' })
    }
  }
  // Getter
  get users(): Collection<User> {
    return this.db.collection(process.env.DB_USERS_COLLECTION as string)
  }
  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESH_TOKENS_COLLECTION as string)
  }
  get followers(): Collection<Followers> {
    return this.db.collection(process.env.DB_FOLLOWERS_COLLECTION as string)
  }
  get tweets(): Collection<Tweet> {
    return this.db.collection(process.env.DB_TWEETS_COLLECTION as string)
  }
  get hashtags(): Collection<Hashtags> {
    return this.db.collection(process.env.DB_HASHTAGS_COLLECTION as string)
  }
  get bookmarks(): Collection<Bookmark> {
    return this.db.collection(process.env.DB_BOOKMARKS_COLLECTION as string)
  }
  get likes(): Collection<Likes> {
    return this.db.collection(process.env.DB_LIKES_COLLECTION as string)
  }
  get conservations(): Collection<Conservations> {
    return this.db.collection(process.env.DB_CONSERVATIONS_COLLECTION as string)
  }
  get notifications(): Collection<Notification> {
    return this.db.collection(process.env.DB_NOTIFICATIONS_COLLECTION as string)
  }
  async connect() {
    try {
      // Send a ping to confirm a successful connection
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } catch (err) {
      console.log('Error: ' + err)
      throw err
    } finally {
      // Ensures that the client will close when you finish/error
      // await this.client.close()
    }
  }
}

const databaseService = new DatabaseService()
export default databaseService
