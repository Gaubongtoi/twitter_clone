import { ParamsDictionary } from 'express-serve-static-core'
import { Request, Response } from 'express'
import { SearchQuery } from '~/models/requests/Search.requests'
import searchService from '~/services/search.services'
import { TokenPayload } from '~/models/requests/User.requests'

export const searchController = async (req: Request<ParamsDictionary, any, any, SearchQuery>, res: Response) => {
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)
  const result = await searchService.search({
    page,
    limit,
    content: req.query.content,
    user_id: req.decode_authorization?.user_id as string
  })
  return res.json({
    message: 'Get search successfully!',
    result,
    total_page: Math.ceil(result.total / Number(req.query.limit))
  })
}
