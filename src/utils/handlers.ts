import { NextFunction, Request, RequestHandler, Response } from 'express'

export const wrapReqHandler = <P>(func: RequestHandler<P, any, any, any>) => {
  return async (req: Request<P>, res: Response, next: NextFunction) => {
    try {
      await func(req, res, next)
    } catch (error) {
      console.log(error)

      next(error)
    }
  }
}
