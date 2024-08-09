import { ObjectId } from 'mongodb'

interface IConservation {
  _id?: ObjectId
  sender_id: ObjectId
  receiver_id: ObjectId
  content: string
  created_at?: Date
  updated_at?: Date
}

export default class Conservations {
  _id?: ObjectId
  sender_id: ObjectId
  receiver_id: ObjectId
  content: string
  created_at: Date
  updated_at: Date
  // Destructuring -> Lấy ra những key của interface IRefreshTokenType
  constructor({ _id, sender_id, receiver_id, created_at, content, updated_at }: IConservation) {
    const date = new Date()
    this._id = _id
    this.sender_id = sender_id
    this.receiver_id = receiver_id
    this.content = content
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
