import { ObjectId } from 'mongodb'
import { UserVerifyStatus } from '~/constants/enums'
// Kiểu dữ liệu số

// Quy định kiểu dữ liệu cho từng trường
interface IUserType {
  _id?: ObjectId
  name: string
  email: string
  date_of_birth: Date
  password: string
  create_at?: Date // '?:' Optional Date or undefined
  update_at?: Date
  email_verify_token?: string
  forgot_password_token?: string
  verify?: UserVerifyStatus
  twitter_circle?: ObjectId[] // danh sach id cua nhung nguoi duoc add vao trong twitter circle
  bio?: string
  location?: string
  website?: string
  username?: string
  avatar?: string
  cover_photo?: string
}

// Khai bao doi tuong User, đồng thời export default
export default class User {
  // Khai báo kiểu dữ liệu
  _id?: ObjectId
  name: string
  email: string
  date_of_birth: Date
  password: string
  create_at: Date
  update_at: Date
  email_verify_token: string
  forgot_password_token: string
  verify: UserVerifyStatus
  twitter_circle: ObjectId[] // danh sach id cua nhung nguoi duoc add vao trong twitter circle
  bio: string
  location: string
  website: string
  username: string
  avatar: string
  cover_photo: string
  // Khởi tạo Constructure : Khuôn mẫu
  constructor(user: IUserType) {
    const date = new Date()
    this._id = user._id
    this.name = user.name || ''
    this.email = user.email
    this.date_of_birth = user.date_of_birth || new Date()
    this.password = user.password
    this.create_at = user.create_at || date // same with update_at
    this.update_at = user.update_at || date // same with create_at
    this.email_verify_token = user.email_verify_token || ''
    this.forgot_password_token = user.forgot_password_token || ''
    this.verify = user.verify || UserVerifyStatus.Unverified
    this.twitter_circle = user.twitter_circle || []
    this.bio = user.bio || ''
    this.location = user.location || ''
    this.website = user.website || ''
    this.username = user.username || ''
    this.avatar = user.avatar || ''
    this.cover_photo = user.cover_photo || ''
  }
}
