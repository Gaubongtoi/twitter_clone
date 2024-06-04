import { User } from '~/models/schema/User.schema'
import { Request } from 'express'
import { TokenPayload } from './models/requests/User.requests'

declare module 'express' {
  interface Request {
    user?: User
    decode_authorization?: TokenPayload // ~ Obj
    decode_refresh_token?: TokenPayload // ~ Obj
    decode_verify_email_token?: TokenPayload
  }
}
