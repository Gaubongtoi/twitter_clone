import { NextFunction, Request, Response } from 'express'
import fs from 'fs' // cũng như các ngôn ngữ khác, việc xử lý file là điều không thể thiếu trong các ứng dụng => fs module giúp ta đọc ghi các file trên hệ thống 1 cách dễ dàng
import path from 'path'
import formidable, { File, errors as formidableErrors } from 'formidable'
// const UPLOAD_FOLDER = 'uploads/temp'
import { UPLOAD_IMAGE_DIR, UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR, UPLOAD_VIDEO_TEMP_DIR } from '~/constants/dir'
export const initFolder = () => {
  ;[UPLOAD_VIDEO_TEMP_DIR, UPLOAD_IMAGE_TEMP_DIR].forEach((dir) => {
    // fs.existSync là method check folder trong đường dẫn đó
    if (!fs.existsSync(dir)) {
      // fs.mkdirSync là method giúp tạo ra 1 folder tại đường dẫn uploadFolder
      fs.mkdirSync(dir, {
        recursive: true // cho phép nested đường dẫn tại resolve('uploads/images')
      })
    }
  })
}

export const handleUploadImage = async (req: Request) => {
  // const formidable = (await import('formidable')).default
  // Formidable cung cấp các công cụ để xử lý biểu mẫu và tệp (file) tải lên để xử lý
  //
  const form = formidable({
    uploadDir: UPLOAD_IMAGE_DIR, // Đường dẫn để upload
    maxFiles: 4, // Giới hạn số file tải lên
    keepExtensions: true, // Giữ lại đuôi mở rộng (anh1.png) -> giữ lại .png
    maxFileSize: 30000 * 1024, // 300KB/file
    maxTotalFileSize: 30000 * 1024 * 4, // 1.2MB (4 files)
    // filter: sử dụng để lọc các tệp tải lên dựa trên các tiêu chí nhất định
    // {name: tên trường, originalFilename: tên tệp gốc, mimitype: loại MIME của tệp}
    filter: ({ name, originalFilename, mimetype }) => {
      // Sau khi upload file lên thì nó sẽ trả về các property này
      // name = image
      // originalFilename = Screenshot 2023-12-27 215241.png
      // mimetype = image/png
      const valid = name === 'image' && Boolean(mimetype?.includes('image/')) // check key field trong form data có phải là image hay không và nó có dạng là image/
      if (!valid) {
        // emit: là 1 method phát ra 1 sự kiện (event)
        // emit ('data': default)
        // Phát ra sự kiện 'error' với tham số đầu tiên là tên sự kiện, tham số thứ 2 là dữ liệu được gửi cùng với sự kiện
        // có name là error, -> từ đó ở nơi nào lắng nghe sự kiện error, nó sẽ bắt tham số thứ 2 này và xử lý tại đó
        form.emit('error' as any, new Error('File type is not valid') as any)
      }
      // Nếu valid là true: tệp sẽ được chấp nhận và tiếp tục xử lý
      // ngược lại thì sẽ từ chối và không xử lý thêm nữa
      return valid
    }
  })

  // const form = formidable()
  // form.on('fileBegin', (name, file) => {
  //   if (file.size > 300 * 1024) { // Check if file size exceeds limit
  //     const error = new Error('File size exceeds the limit of 300KB');
  //     form.emit('error', error); // Emit an error event
  //     form.emit('data', error)
  //   }
  // });
  // Trả về 1 Promise để dễ dàng throw ra lỗi qua cho error handler
  return new Promise<File[]>((resolve, reject) => {
    // Method form.parse: dùng để phân tích biểu mẫu form data từ yêu cầu HTTP, nó chủ yếu được sử dụng
    // để xử lý các nội dung dạng 'multipart/form-data', như khi người dùng upload
    // file thông qua form data
    // + Tham số đầu tiên sẽ là req, nó sẽ phân tích các trường dữ liệu và các tệp tải lên
    // + Tham số thứ 2 sẽ là 1 callback với 3 tham số: err, fields, files
    form.parse(req, (err, fields, files) => {
      // Nếu lỗi trong plugin option trong formidable
      if (err) {
        console.log(err)

        return reject(err)
      }
      // Kiểm tra files.image nếu không upload cái gì lên
      // => throw ra 1 reject Error -> error handler
      // eslint-disable-next-line no-extra-boolean-cast
      if (!Boolean(files.image)) {
        return reject(new Error('File is empty'))
      }
      resolve(files.image as File[])
    })
  })
}
export const handleUploadVideo = async (req: Request) => {
  const form = formidable({
    uploadDir: UPLOAD_VIDEO_DIR, // Đường dẫn để upload
    maxFiles: 1, // Giới hạn số file tải lên
    // keepExtensions: true, // Giữ lại đuôi mở rộng (anh1.png) -> giữ lại .png
    maxFileSize: 50 * 1024 * 1024, // 50MB
    filter: ({ name, originalFilename, mimetype }) => {
      // Check xem key của data req truyền tới server có tồn tại dưới cái tên là 'video' hay không
      // Check đuôi type của file đó (string) có chứa 'mp4' ko
      // Và check quicktime
      const valid = name === 'video' && Boolean(mimetype?.includes('mp4') || mimetype?.includes('quicktime'))
      console.log(valid)

      if (!valid) {
        form.emit('error' as any, new Error('File type is not valid') as any)
      }
      return valid
    }
  })

  // const form = formidable()
  // form.on('fileBegin', (name, file) => {
  //   if (file.size > 300 * 1024) { // Check if file size exceeds limit
  //     const error = new Error('File size exceeds the limit of 300KB');
  //     form.emit('error', error); // Emit an error event
  //     form.emit('data', error)
  //   }
  // });
  // Trả về 1 Promise để dễ dàng throw ra lỗi qua cho error handler thông qua method reject
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      console.log('Files:', files)
      if (err) {
        return reject(err) // Trả về lỗi nếu có lỗi xảy ra
      }
      if (!files.video) {
        return reject(new Error('File is empty')) // Trả về lỗi nếu không có tệp nào được tải lên
      }
      const videos = files.video as File[]
      videos.forEach((video) => {
        const ext = getExtension(video.originalFilename as string)
        fs.renameSync(video.filepath, video.filepath + '.' + ext)
        video.newFilename = video.newFilename + '.' + ext
        video.filepath = video.filepath + '.' + ext
      })
      resolve(files.video as File[]) // Trả về các tệp đã tải lên
    })
  })
}

export const getNameFromFullname = (fullname: string) => {
  const nameArr = fullname.split('.')
  // method pop sẽ xoá phần tử cuối cùng của mảng nameArr
  nameArr.pop()
  return nameArr.join('')
}

export const getExtension = (fullname: string) => {
  const nameArr = fullname.split('.')
  return nameArr[nameArr.length - 1]
}
