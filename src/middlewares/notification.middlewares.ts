import { checkSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { HasRead, NotificationType } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import { numberEnumToArray } from '~/utils/common'
import { validate } from '~/utils/validation'
const notificationTypes = numberEnumToArray(NotificationType)
const hasReadTypes = numberEnumToArray(HasRead)

export const createNotificationValidator = validate(
  checkSchema({
    type: {
      isIn: {
        options: [notificationTypes],
        errorMessage: 'Invalid Types of Notification'
      }
    },
    receiver_id: {
      custom: {
        options: async (value, { req }) => {
          if (!ObjectId.isValid(value)) {
            throw new ErrorWithStatus({ message: 'Receiver_id is not valid', status: HTTP_STATUS.BAD_REQUEST })
          }
          return true
        }
      }
    },
    tweet_id: {
      custom: {
        options: async (value, { req }) => {
          let type = Number(req.body.type)
          // Check Type send by Client body request
          if (
            [NotificationType.Like, NotificationType.QuoteTweet, NotificationType.Comment].includes(type) &&
            !ObjectId.isValid(value)
          ) {
            throw new Error('Tweet_id must be a valid tweet_id')
          }
          // Check value
          if ((type === NotificationType.Message || type === NotificationType.Following) && value !== null) {
            throw new Error('Tweet_id must be null')
          }
          return true
        }
      }
    },
    hasRead: {
      optional: true,
      isIn: {
        options: [hasReadTypes],
        errorMessage: 'Invalid Types of HasRead'
      }
    }
  })
)
