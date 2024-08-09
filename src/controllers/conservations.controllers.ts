import { Request, Response } from 'express'
import { Pagination } from '~/models/requests/Tweet.requests'
import conservationService from '~/services/conservations.services'
import { GetConversationParams } from '~/models/requests/Conversations.requests'

export const getConservationController = async (
  req: Request<GetConversationParams, any, any, Pagination>,
  res: Response
) => {
  const { receiver_id } = req.params
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
