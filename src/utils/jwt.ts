import jwt from 'jsonwebtoken'

export const signToken = ({
  // Payload: data truyền vào
  payload,
  // Private key
  privateKey = process.env.JWT_SECRET as string,
  options = {
    algorithm: 'HS256' // thuat toan encode
  }
}: {
  payload: string | object | Buffer //default
  privateKey?: string //default
  // Default
  options?: jwt.SignOptions //default
}) => {
  // Bất đông bộ asynchronously
  return new Promise<string>((resolve, reject) => {
    // Khi dang ki, no se kiem tra privateKey, nếu đúng, nó sẽ tiến hành mã hoá (encode) những giá trị có những kiểu dữ liệu
    // (string | object | Buffer)
    // chúng ta cũng có thể cấu hình thêm cho payload trong tham số options
    jwt.sign(payload, privateKey, options, (error, token) => {
      if (error) {
        reject(error)
      }
      resolve(token as string)
    })
  })
}
