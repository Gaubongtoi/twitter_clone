import { ObjectId } from 'mongodb'
import { TweetAudience, TweetType } from '~/constants/enums'
import { Media } from '../Others'

interface TweetConstructor {
  _id?: ObjectId
  user_id: ObjectId //
  type: TweetType // Loai tweet
  audience: TweetAudience // Đối tượng khán giả mà chúng ta hướng đến: Công khai (public), Chỉ 1 mình tôi (private)
  content: string // Nội dung bài tweet
  parent_id: null | string // Tweet cha
  hashtags: ObjectId[] // hashtags có dạng là 1 array string chứa những hashtag ['js', 'react']
  mentions: string[] // user_id của những người được tag vào tweet [ObjectId: string, ObjectId: string]
  medias: Media[]
  guest_views?: number
  user_views?: number
  created_at?: Date
  updated_at?: Date
}

export default class Tweet {
  _id?: ObjectId
  user_id: ObjectId //
  type: TweetType // Loai tweet
  audience: TweetAudience // Đối tượng khán giả mà chúng ta hướng đến: Công khai (public), Chỉ 1 mình tôi (private)
  content: string // Nội dung bài tweet
  parent_id: null | ObjectId // Tweet cha
  hashtags: ObjectId[] // hashtags có dạng là 1 array string chứa những hashtag ['js', 'react']
  mentions: ObjectId[] // user_id của những người được tag vào tweet [ObjectId: string, ObjectId: string]
  medias: Media[]
  guest_views: number
  user_views: number
  created_at?: Date
  updated_at?: Date
  constructor({
    _id,
    user_id,
    type,
    audience,
    content,
    parent_id,
    hashtags,
    mentions,
    medias,
    user_views,
    guest_views,
    created_at,
    updated_at
  }: TweetConstructor) {
    const date = new Date()
    this._id = _id
    this.user_id = user_id
    this.type = type
    this.audience = audience
    this.content = content
    this.parent_id = parent_id ? new ObjectId(parent_id) : null
    this.hashtags = hashtags
    this.mentions = mentions.map((item) => new ObjectId(item))
    this.medias = medias
    this.user_views = user_views || 0
    this.guest_views = guest_views || 0
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
