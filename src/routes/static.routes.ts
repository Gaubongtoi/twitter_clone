import { Router } from 'express'
import { serveImageController, serveVideoStreamController } from '~/controllers/medias.controllers'
import { wrapReqHandler } from '~/utils/handlers'

const staticRouter = Router()

// Truyền qua http method trong param -> :name để lấy ra những thứ đằng sau image/
staticRouter.get('/image/:name', serveImageController)
// Truyền qua http method trong param -> :name để lấy ra những thứ đằng sau image/
staticRouter.get('/video-stream/:name', wrapReqHandler(serveVideoStreamController))
export default staticRouter
