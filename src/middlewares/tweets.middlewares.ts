import { validate } from '~/utils/validation'
import { checkSchema } from 'express-validator'
import { MediaType, TweetAudience, TweetType } from '~/constants/enums'
import { numberEnumToArray } from '~/utils/common'
import { ObjectId } from 'mongodb'
import { isEmpty } from 'lodash'
const tweetTypes = numberEnumToArray(TweetType)
const audienceTypes = numberEnumToArray(TweetAudience)
const mediaTypes = numberEnumToArray(MediaType)

console.log(tweetTypes)

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
          if (
            [TweetType.Comment, TweetType.QuoteTweet, TweetType.Tweet].includes(type) &&
            isEmpty(hashtags) && // check arr isEmpty
            isEmpty(mentions) && // check arr isEmpty
            value === '' // content truyền vào phải là 1 chuỗi và không được rỗng
          ) {
            throw new Error('Content must be a non empty string')
          }
          if (type === TweetType.Retweet && value !== null) {
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
      isArray: true,
      custom: {
        // Media cần phải gửi lên server 1 mảng
        options: (value, { req }) => {
          if (value.some((item: any) => typeof item.url !== 'string' || typeof !mediaTypes.includes(item.type))) {
            throw new Error('Media must be an array of media object')
          }
          return true
        }
      }
    }
  })
)
