import { NextFunction, Request, Response } from 'express'
import path from 'path'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR, UPLOAD_VIDEO_TEMP_DIR } from '~/constants/dir'
import HTTP_STATUS from '~/constants/httpStatus'
// import formidable from 'formidable'
import mediaService from '~/services/media.services'
import fs from 'fs'
// import { Mime } from 'mime'
// import mime from 'mime';

// import mime from 'mime'
export const uploadImageController = async (req: Request, res: Response, next: NextFunction) => {
  const result = await mediaService.uploadImage(req)
  return res.json({
    message: 'Upload successfully!',
    result: result
  })
}
export const uploadVideoController = async (req: Request, res: Response, next: NextFunction) => {
  const result = await mediaService.uploadVideo(req)
  return res.json({
    message: 'Upload successfully!',
    result: result
  })
}

export const uploadVideoHLSController = async (req: Request, res: Response, next: NextFunction) => {
  const result = await mediaService.uploadVideoHLS(req)
  return res.json({
    message: 'Upload successfully!',
    result: result
  })
}

export const serveImageController = (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.params
  // sendFile: được sử dụng để gửi 1 tệp file từ server tới client -> đơn giản hoá việc gửi tệp
  // như tài liệu HTML, hình ảnh, video,...
  // + Tham số thứ nhất: path
  // + ........... hai: options -> 'maxAge', 'root', 'headers',...
  // + ........... ba: callback -> được gọi khi quá trình gửi tệp hoàn tất or thất bại -> custom response status here
  return res.sendFile(path.resolve(UPLOAD_IMAGE_DIR, name + '.jpg'), (err) => {
    if (err) {
      res.status((err as any).status).send('Not found')
    }
  })
}

export const serveVideoStreamController = async (req: Request, res: Response, next: NextFunction) => {
  const mime = (await import('mime')).default
  const range = req.headers.range
  // console.log(req.headers.range)

  if (!range) {
    return res.status(HTTP_STATUS.BAD_REQUEST).send('Requires range headers')
  }
  const { name } = req.params
  const videoPath = path.resolve(UPLOAD_VIDEO_DIR, name)

  // 1MB = 10^6 bytes (Tính theo hệ 10, đây là thứ mà chúng ta hay thấy trên UI)
  // Còn nếu tính theo hệ nhị phân thì 1MB = 2^20 bytes (1024*1024)
  const videoSize = fs.statSync(videoPath).size

  // Dung lượng video cho mỗi phân đoạn stream
  const chunkSize = 10 ** 7 // 1MB
  // Lấy giá trị byte bắt đầu từ Headers Range (vd: byte=102314-)
  const start = Number(range.replace(/\D/g, ''))
  // Lấy giá trị byte kết thúc, nếu như vượt quá dung lượng video thì lấy giá trị videoSize
  const end = Math.min(start + chunkSize, videoSize - 1)

  // Dung lượng thực tế cho mỗi đoạn video stream
  // Thường đây sẽ là chunkSize, ngoại trừ đoạn cuối cùng
  const contentLength = end - start + 1
  const contentType = mime.getType(videoPath) || 'video/*'
  const headers = {
    'Content-Range': `bytes ${start}-${end}/${videoSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': contentLength,
    'Content-Type': contentType
  }
  res.writeHead(HTTP_STATUS.PARTIAL_CONTENT, headers)
  const videoStreams = fs.createReadStream(videoPath, { start, end })
  videoStreams.pipe(res)
}
