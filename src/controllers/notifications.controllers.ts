import { ParamsDictionary } from 'express-serve-static-core'
import { Request, Response } from 'express'
import { NotificationReqBody } from '~/models/requests/Notification.requests'
import notificationService from '~/services/notification.services'
import { TokenPayload } from '~/models/requests/User.requests'
import { Pagination } from '~/models/requests/Tweet.requests'

export const createNotificationController = async (
  req: Request<ParamsDictionary, any, NotificationReqBody>,
  res: Response
) => {
  // console.log(req)
  const { user_id } = req.decode_authorization as TokenPayload

  await notificationService.createNotification(req.body, user_id)
  return res.json({
    message: 'Create Notification Successfully!'
  })
}

export const getNotificationByIdController = async (
  req: Request<ParamsDictionary, any, any, Pagination>,
  res: Response
) => {
  const result = await notificationService.getNotification({
    limit: Number(req.query.limit),
    page: Number(req.query.page),
    user_id: req.decode_authorization?.user_id as string
  })
  return res.json({
    message: 'Get Notification Successfully!',
    result: result.notifications,
    total_page: Math.ceil(result.total / Number(req.query.limit))
  })
}

export const checkNotificationsByIdController = async (
  req: Request<ParamsDictionary, any, any, any>,
  res: Response
) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const result = await notificationService.checkNotification(user_id)
  return res.json({
    message: 'Check Notification Successfully!',
    hasNotification: result
  })
}
