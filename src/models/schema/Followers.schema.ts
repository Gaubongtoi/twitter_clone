import { ObjectId } from 'mongodb'

interface IFollowers {
  _id?: ObjectId
  user_id: ObjectId
  followed_user_id: ObjectId
  created_at?: Date
}

export default class Followers {
  _id?: ObjectId
  user_id: ObjectId
  followed_user_id: ObjectId
  created_at: Date
  // Destructuring -> Lấy ra những key của interface IRefreshTokenType
  constructor({ _id, user_id, followed_user_id, created_at }: IFollowers) {
    this._id = _id
    this.user_id = user_id
    this.followed_user_id = followed_user_id
    this.created_at = created_at || new Date()
  }
}
