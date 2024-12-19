import Notification from '~/models/schema/Notifications.schema'
import databaseService from './database.services'
import { NotificationReqBody } from '~/models/requests/Notification.requests'
import { ObjectId } from 'mongodb'
import { HasRead } from '~/constants/enums'

class NotificationService {
  async createNotification(body: NotificationReqBody, user_id: string) {
    if (user_id === body.receiver_id) {
      return
    }
    await databaseService.notifications.insertOne(
      new Notification({
        type: body.type,
        sender_id: new ObjectId(user_id),
        receiver_id: new ObjectId(body.receiver_id),
        tweet_id: body.tweet_id,
        content: body.content
      })
    )
    return
  }
  async getNotification({ user_id, page, limit }: { user_id: string; page: number; limit: number }) {
    const [notifications, total] = await Promise.all([
      databaseService.notifications
        .aggregate([
          {
            $match:
              /**
               * query: The query in MQL.
               */
              {
                receiver_id: new ObjectId(user_id)
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
                localField: 'sender_id',
                foreignField: '_id',
                as: 'sender'
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
                path: '$sender'
              }
          },
          {
            $project:
              /**
               * specifications: The fields to
               *   include or exclude.
               */
              {
                sender: {
                  _id: 0,
                  password: 0,
                  email_verify_token: 0,
                  forgot_password_token: 0,
                  date_of_birth: 0,
                  cover_photo: 0,
                  verify: 0,
                  create_at: 0,
                  update_at: 0,
                  location: 0,
                  twitter_circle: 0
                }
              }
          },

          {
            $sort: { created_at: -1 }
          },
          {
            $skip: (page - 1) * limit
          },
          {
            $limit: limit
          }
        ])
        .toArray(),
      databaseService.notifications.countDocuments({
        receiver_id: new ObjectId(user_id)
      })
    ])
    const notificationIds = notifications.map((notification) => notification._id)
    await databaseService.notifications.updateMany(
      { _id: { $in: notificationIds } },
      { $set: { hasRead: HasRead.Read } }
    )
    return {
      notifications,
      total
    }
  }
  async checkNotification(user_id: string) {
    const hasNotification = await databaseService.notifications.findOne({
      receiver_id: new ObjectId(user_id),
      hasRead: HasRead.Unread
    })
    return !!hasNotification
  }
}

const notificationService = new NotificationService()
export default notificationService
