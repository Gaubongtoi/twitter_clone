import { Request, Response } from 'express'
import path from 'path'
import sharp from 'sharp' // là 1 thư viện xử lý hình ảnh hiệu suất cao cho Node.js -> custom hình ảnh
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import { getNameFromFullname, handleUploadImage, handleUploadVideo } from '~/utils/files'
import fs from 'fs'
import { isProduction } from '~/constants/config'
import { MediaType } from '~/constants/enums'
import { Media } from '~/models/Others'
import { encodeHLSWithMultipleVideoStreams } from '~/utils/video'
// console.log(isProduction);

class MediaService {
  async uploadImage(req: Request) {
    const files = await handleUploadImage(req)
    // console.log(files)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newName = getNameFromFullname(file.newFilename)
        // sharp(file.filepath)
        await sharp(file.filepath)
          .jpeg({
            quality: 70
          })
          .toFile(path.resolve(UPLOAD_IMAGE_DIR, `${newName}.jpg`))
        fs.unlinkSync(file.filepath)
        return {
          url: isProduction
            ? `${process.env.HOST}/static/image/${newName}`
            : `http://localhost:${process.env.PORT}/static/image/${newName}`,
          type: MediaType.Image
        }
      })
    )
    return result
  }
  async uploadVideo(req: Request) {
    const files = await handleUploadVideo(req)
    const { newFilename } = files[0]
    return {
      url: isProduction
        ? `${process.env.HOST}/static/video-stream/${newFilename}`
        : `http://localhost:${process.env.PORT}/static/video-stream/${newFilename}`,
      type: MediaType.Video
    }

    // return result
  }
  async uploadVideoHLS(req: Request) {
    const files = await handleUploadVideo(req)
    // const { newFilename } = files[0]
    const result = Promise.all(
      files.map(async (file) => {
        await encodeHLSWithMultipleVideoStreams(file.filepath)
        return {
          url: isProduction
            ? `${process.env.HOST}/static/video-stream/${file.newFilename}`
            : `http://localhost:${process.env.PORT}/static/video-stream/${file.newFilename}`,
          type: MediaType.Video
        }
      })
    )
    console.log(result)
    return result
    // return result
  }
}

const mediaService = new MediaService()
export default mediaService
