import { Request, Response } from 'express'
import path from 'path'
import sharp from 'sharp' // là 1 thư viện xử lý hình ảnh hiệu suất cao cho Node.js -> custom hình ảnh
import { UPLOAD_IMAGE_DIR, UPLOAD_IMAGE_TEMP_DIR } from '~/constants/dir'
import { getNameFromFullname, handleUploadImage, handleUploadVideo } from '~/utils/files'
import fs from 'fs'
import { isProduction } from '~/constants/config'
import { MediaType } from '~/constants/enums'
import { Media } from '~/models/Others'
import { encodeHLSWithMultipleVideoStreams } from '~/utils/video'
import cloudinary from '~/utils/cloundinary'
// console.log(isProduction);

class MediaService {
  // async uploadImage(req: Request) {
  //   const files = await handleUploadImage(req)
  //   // console.log(files)
  //   const result: Media[] = await Promise.all(
  //     files.map(async (file) => {
  //       const newName = getNameFromFullname(file.newFilename)
  //       console.log(file.newFilename)

  //       console.log(file.filepath)
  //       console.log(path.resolve(UPLOAD_IMAGE_DIR, `${newName}.jpg`))
  //       // sharp(file.filepath)
  //       await sharp(file.filepath)
  //         .jpeg({
  //           quality: 70
  //         })
  //         .toFile(path.resolve(UPLOAD_IMAGE_DIR, `${newName}.jpg`))
  //       fs.unlinkSync(file.filepath)

  //       // const cloudinaryResult = await cloudinary.uploader.upload(path.resolve(UPLOAD_IMAGE_DIR, `${newName}.jpg`), {
  //       //   folder: 'my_uploads', // Thay đổi tên thư mục nếu cần
  //       //   public_id: newName // Tùy chọn: thiết lập ID công khai
  //       // })
  //       // fs.unlinkSync(path.resolve(UPLOAD_IMAGE_DIR, `${newName}.jpg`))
  //       return {
  //         url: isProduction
  //           ? `${process.env.HOST}/static/image/${newName}`
  //           : `http://localhost:${process.env.PORT}/static/image/${newName}`,
  //         type: MediaType.Image
  //         // cloudinary_url: cloudinaryResult.secure_url
  //       }
  //     })
  //   )

  //   return result
  // }
  async uploadImage(req: Request) {
    const files = await handleUploadImage(req)

    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        let cloudinaryUrl // Khai báo biến để lưu URL từ Cloudinary
        const newName = getNameFromFullname(file.newFilename)
        const newPath = path.resolve(UPLOAD_IMAGE_DIR, `${newName}.jpg`)
        if (file.newFilename.split('.')[1] === 'png') {
          await sharp(file.filepath).jpeg({ quality: 70 }).toFile(newPath) // Đường dẫn đầu ra khác với đường dẫn đầu vào
          // Xóa file gốc
          const cloudinaryResult = await cloudinary.uploader.upload(newPath, {
            folder: 'my_uploads', // Thay đổi tên thư mục nếu cần
            public_id: newName // Tùy chọn: thiết lập ID công khai
          })
          cloudinaryUrl = cloudinaryResult.secure_url
          fs.unlinkSync(file.filepath)
        } else {
          // Chuyển đổi hình ảnh
          // Tạo một đường dẫn tạm thời
          const tempPath = path.resolve(UPLOAD_IMAGE_DIR, `${newName}_temp.jpg`)
          console.log(tempPath)
          // Giữ nguyên JPG và lưu với chất lượng 70 vào đường dẫn tạm thời
          await sharp(file.filepath).jpeg({ quality: 70 }).toFile(tempPath)
          // Đổi tên tệp tạm thành tệp gốc
          fs.renameSync(tempPath, newPath)
          const cloudinaryResult = await cloudinary.uploader.upload(newPath, {
            folder: 'my_uploads', // Thay đổi tên thư mục nếu cần
            public_id: newName // Tùy chọn: thiết lập ID công khai
          })
          cloudinaryUrl = cloudinaryResult.secure_url
        }

        return {
          url: isProduction
            ? `${process.env.HOST}/static/image/${newName}`
            : `http://localhost:${process.env.PORT}/static/image/${newName}`,
          type: MediaType.Image,
          cloudinary_url: cloudinaryUrl // Trả về URL từ Cloudinary
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
    return result
    // return result
  }
}

const mediaService = new MediaService()
export default mediaService
