import { config } from 'dotenv'
import jwt from 'jsonwebtoken'
import { TokenPayload } from '~/models/requests/User.requests'
config()
export const signToken = ({
  // Payload: data truyền vào
  payload,
  // Private key
  privateKey,
  options = {
    algorithm: 'HS256' // thuat toan encode
  }
}: {
  // Các cấu hình này là do jwt.sign quy định cho tham số truyền vào
  // Việc dùng TS để xử lý giúp cho việc xử lý tham số đầu vào 1 cách chuẩn xác và chặt chẽ hơn
  payload: string | object | Buffer //default
  privateKey: string //default
  // Default
  options?: jwt.SignOptions //default
}) => {
  // Bất đông bộ asynchronously
  return new Promise<string>((resolve, reject) => {
    // Tham số truyền vào method jwt.sign này sẽ là

    // + payload: đây sẽ là nơi nạp vào id của người dùng cũng như thông tin về loại Token
    // (Ex:
    // payload: {
    //   user_id,
    //   type: TokenType.AccessToken
    // })
    // + privateKey (signature): privateKey này giúp cho việc bảo mật Token được tốt hơn, thường được cấu hình trong file .env
    // + options: là nơi cấu hình thuật toán, ngày hết hạn và ngày khởi tạo ra token đó
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

// verifyToken sẽ nhận vào 1 obj chứa 2 tham số là token (-> được truyền vào bên phía service) và secretOnPublicKey (signature)
export const verifyToken = ({
  token,
  secretOnPublicKey
}: {
  token: string
  secretOnPublicKey: string //optinal -> đã truyền giá trị mặc định
}) => {
  return new Promise<TokenPayload>((resolve, reject) => {
    jwt.verify(token, secretOnPublicKey, (error, decoded) => {
      if (error) {
        throw reject(error)
      }
      resolve(decoded as TokenPayload)
    })
  })
}
