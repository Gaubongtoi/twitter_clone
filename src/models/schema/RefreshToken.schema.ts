import { ObjectId } from 'mongodb'

interface IRefreshTokenType {
  _id?: ObjectId
  token: string
  created_at?: Date //optional
  user_id: ObjectId
}

export default class RefreshToken {
  _id?: ObjectId
  token: string
  created_at: Date
  user_id: ObjectId
  // Destructuring -> Lấy ra những key của interface IRefreshTokenType
  constructor({ _id, token, created_at, user_id }: IRefreshTokenType) {
    this._id = _id
    this.token = token
    this.created_at = created_at || new Date()
    this.user_id = user_id
  }
}
