import { ParamsDictionary } from 'express-serve-static-core'
import { Request, Response } from 'express'
import { SearchMentionsQuery, SearchQuery } from '~/models/requests/Search.requests'
import searchService from '~/services/search.services'

export const searchController = async (req: Request<ParamsDictionary, any, any, SearchQuery>, res: Response) => {
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)
  const result = await searchService.search({
    page,
    limit,
    content: req.query.content,
    media_type: req.query.media_type,
    people_follow: req.query.people_follow,
    user_id: req.decode_authorization?.user_id as string
  })
  return res.json({
    message: 'Get search successfully!',
    result,
    total_page: Math.ceil(result.total / Number(req.query.limit))
  })
}

export const searchMentionsController = async (
  req: Request<ParamsDictionary, any, any, SearchMentionsQuery>,
  res: Response
) => {
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)
  const result = await searchService.searchMentions({
    page,
    limit,
    q: req.query.q,
    user_id: req.decode_authorization?.user_id as string
  })
  return res.json({
    result,
    total_page: Math.ceil(result.total / Number(req.query.limit))
  })
}

export const searchHashtagsController = async (
  req: Request<ParamsDictionary, any, any, SearchMentionsQuery>,
  res: Response
) => {
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)
  const result = await searchService.searchHashtags({
    page,
    limit,
    q: req.query.q,
    user_id: req.decode_authorization?.user_id as string
  })
  return res.json({
    result,
    total_page: Math.ceil(result.total / Number(req.query.limit))
  })
}
