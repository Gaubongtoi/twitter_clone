import { Router } from 'express'
import {
  checkNotificationsByIdController,
  createNotificationController,
  getNotificationByIdController
} from '~/controllers/notifications.controllers'
import { createNotificationValidator } from '~/middlewares/notification.middlewares'
import { paginationValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, isUserLoggedInValidator, verifiedUserValidatior } from '~/middlewares/users.middlewares'
import { wrapReqHandler } from '~/utils/handlers'

const notificationRoutes = Router()

notificationRoutes
  /*
 * Description: Create notification
 * Path: /
 * Method: POST
 * Header: {Authorization?: Bearer {access_token}}
 * Body: {type: NotificationType
  sender_id: ObjectId
  receiver_id: ObjectId
  tweet_id?: ObjectId
  hasRead?: HasRead}
 * Ý tưởng: đầu vào sẽ bao gồm access_token -> get ra được user_id
 */
  .post(
    '/',
    isUserLoggedInValidator(accessTokenValidator),
    // isUserLoggedInValidator(verifiedUserValidatior),
    createNotificationValidator,
    wrapReqHandler(createNotificationController)
  )
  .get(
    '/',
    isUserLoggedInValidator(accessTokenValidator),
    // isUserLoggedInValidator(verifiedUserValidatior),
    paginationValidator,
    wrapReqHandler(getNotificationByIdController)
  )
  .get(
    '/check-notifications',
    isUserLoggedInValidator(accessTokenValidator),
    // isUserLoggedInValidator(verifiedUserValidatior),
    wrapReqHandler(checkNotificationsByIdController)
  )
export default notificationRoutes
