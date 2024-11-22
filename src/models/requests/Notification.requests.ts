import { HasRead, NotificationType } from '~/constants/enums'

export interface NotificationReqBody {
  type: NotificationType
  sender_id: string
  receiver_id: string
  tweet_id: null | string
  hasRead?: HasRead
  content?: string
}
