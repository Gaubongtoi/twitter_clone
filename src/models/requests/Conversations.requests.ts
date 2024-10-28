import { ParamsDictionary, Query } from 'express-serve-static-core'
import { Pagination } from './Tweet.requests'
export interface GetConversationParams extends ParamsDictionary {
  receiver_id: string
}

export interface GetConversationQuery extends Pagination {
  receiver_id: string
}
