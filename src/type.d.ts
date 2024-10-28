import { User } from '~/models/schema/User.schema'
import { Request } from 'express'
import { TokenPayload } from './models/requests/User.requests'
import Tweet from './models/schema/Tweets.schema'

declare module 'express' {
  interface Request {
    user?: User
    decode_authorization?: TokenPayload // ~ Obj
    decode_refresh_token?: TokenPayload // ~ Obj
    decode_verify_email_token?: TokenPayload
    decode_forgot_password_token?: TokenPayload
    tweet?: Tweet
  }
}
