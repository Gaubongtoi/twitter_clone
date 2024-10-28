import { faker } from '@faker-js/faker'
import { ObjectId } from 'mongodb'
import { TweetAudience, TweetType, UserVerifyStatus } from '~/constants/enums'
import { TweetReqBody } from '~/models/requests/Tweet.requests'
import { RegisterReqBody } from '~/models/requests/User.requests'
import Followers from '~/models/schema/Followers.schema'
import User from '~/models/schema/User.schema'
import databaseService from '~/services/database.services'
import tweetService from '~/services/tweets.services'
import hashPassword from './crypto'

// Mat khau duoc dung de fake user
const PASSWORD = 'TAN123!'
// ID tai khoan cua minh, dung de follow nguoi khac
const MYID = new ObjectId('668223d809420cd1cd153599')
// So luong user duoc tao, moi user se mac dinh tweet 2 cai
const USER_COUNT = 100
const createRandomUser = () => {
  const user: RegisterReqBody = {
    name: faker.internet.displayName(),
    email: faker.internet.email(),
    password: PASSWORD,
    confirm_password: PASSWORD,
    date_of_birth: faker.date.past().toISOString()
  }
  return user
}

const createRandomTweet = () => {
  const tweet: TweetReqBody = {
    type: TweetType.Tweet,
    audience: TweetAudience.EveryOne,
    content: faker.lorem.paragraph({
      min: 10,
      max: 160
    }),
    hashtags: [],
    medias: [],
    mentions: [],
    parent_id: null
  }
  return tweet
}

const users: RegisterReqBody[] = faker.helpers.multiple(createRandomUser, {
  count: USER_COUNT
})
const insertMultipleUsers = async (users: RegisterReqBody[]) => {
  const result = await Promise.all(
    users.map(async (user) => {
      const user_id = new ObjectId()
      await databaseService.users.insertOne(
        new User({
          ...user,
          username: `user${user_id.toString()}`,
          password: hashPassword(user.password),
          date_of_birth: new Date(user.date_of_birth),
          verify: UserVerifyStatus.Verified
        })
      )
      return user_id
    })
  )
  return result
}

const followMultipleUsers = async (user_id: ObjectId, followed_user_ids: ObjectId[]) => {
  const result = await Promise.all(
    followed_user_ids.map(async (followed_user_id) => {
      await databaseService.followers.insertOne(
        new Followers({
          user_id,
          followed_user_id: new ObjectId(followed_user_id)
        })
      )
    })
  )

  return result
}

const insertMultipleTweets = async (ids: ObjectId[]) => {
  let count = 0
  const result = await Promise.all(
    ids.map(async (id) => {
      await Promise.all([
        tweetService.createTweet(createRandomTweet(), id.toString()),
        tweetService.createTweet(createRandomTweet(), id.toString())
      ])
      count += 2
    })
  )
  return result
}

insertMultipleUsers(users).then((ids) => {
  followMultipleUsers(new ObjectId(MYID), ids)
  insertMultipleTweets(ids)
})
