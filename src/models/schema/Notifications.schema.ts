import { ObjectId } from 'mongodb'
import { HasRead, NotificationType } from '~/constants/enums'
interface INotification {
  _id?: ObjectId
  type: NotificationType
  sender_id: ObjectId
  receiver_id: ObjectId
  tweet_id: null | string // Nullable
  content?: string
  hasRead?: HasRead
  created_at?: Date
  updated_at?: Date
}
class Notification {
  _id: ObjectId
  type: NotificationType
  sender_id: ObjectId
  receiver_id: ObjectId
  tweet_id: null | ObjectId
  content?: string
  hasRead?: HasRead
  created_at?: Date
  updated_at?: Date
  constructor({
    _id,
    type,
    sender_id,
    receiver_id,
    tweet_id,
    hasRead,
    content,
    created_at,
    updated_at
  }: INotification) {
    const date = new Date()
    this._id = _id || new ObjectId()
    this.type = type
    this.sender_id = sender_id
    this.receiver_id = receiver_id
    this.tweet_id = tweet_id ? new ObjectId(tweet_id) : null
    this.content = content || ''
    this.hasRead = hasRead || HasRead.Unread
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}

export default Notification
