import { Router } from 'express'
import {
  uploadImageController,
  uploadVideoController,
  uploadVideoHLSController
} from '~/controllers/medias.controllers'
import { accessTokenValidator, verifiedUserValidatior } from '~/middlewares/users.middlewares'
import { wrapReqHandler } from '~/utils/handlers'
const mediasRouter = Router()

/*
 * Description: Upload Single Image
 * Path: /upload-image
 * Mehtod: POST
 * Body: {Form Data: image}
 * Ràng buộc: bắt buộc phải login
 */
mediasRouter.post(
  '/upload-image',
  accessTokenValidator,
  // verifiedUserValidatior
  wrapReqHandler(uploadImageController)
)

/*
 * Description: Upload Single Video
 * Path: /upload-video
 * Mehtod: POST
 * Body: {}
 */
mediasRouter.post(
  '/upload-video',
  accessTokenValidator,
  // verifiedUserValidatior,
  wrapReqHandler(uploadVideoController)
)
/*
 * Description: Upload Single Video
 * Path: /upload-video
 * Mehtod: POST
 * Body: {}
 */
mediasRouter.post(
  '/upload-video-hls',
  accessTokenValidator,
  // verifiedUserValidatior,
  wrapReqHandler(uploadVideoHLSController)
)

export default mediasRouter
