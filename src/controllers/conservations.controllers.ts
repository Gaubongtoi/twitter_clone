import { Request, Response } from 'express'
import { Pagination } from '~/models/requests/Tweet.requests'
import conservationService from '~/services/conservations.services'
import { GetConversationQuery } from '~/models/requests/Conversations.requests'
import { TokenPayload } from '~/models/requests/User.requests'

export const getConservationController = async (req: Request<any, any, any, GetConversationQuery>, res: Response) => {
  const { receiver_id } = req.query
  const sender_id = req.decode_authorization?.user_id as string
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)

  const result = await conservationService.getConservation({
    sender_id,
    receiver_id,
    limit,
    page
  })
  return res.json({
    message: 'Get conservations successfully!',
    result: {
      limit,
      page,
      total_page: Math.ceil(result.total / limit),
      conversations: result.conservations
    }
  })
}

export const getReceiversController = async (req: Request<any, any, any, Pagination>, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const result = await conservationService.getReceivers({
    user_id,
    limit: Number(req.query.limit),
    page: Number(req.query.page)
  })
  return res.json({
    message: 'Get receivers successfully!',
    result,
    total_page: Math.ceil(result.total / Number(req.query.limit))
  })
}
