import { ObjectId } from 'mongodb'

interface IHashtags {
  _id?: ObjectId
  name: string
  created_at?: Date
}

export default class Hashtags {
  _id?: ObjectId
  name: string
  created_at: Date
  constructor({ _id, name, created_at }: IHashtags) {
    this._id = _id || new ObjectId()
    this.name = name
    this.created_at = created_at || new Date()
  }
}
