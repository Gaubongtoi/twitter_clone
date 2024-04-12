import { Request, Response, NextFunction } from 'express'
import { checkSchema } from 'express-validator'
import { ErrorWithStatus } from '~/models/Errors'
import usersService from '~/services/users.services'
import { validate } from '~/utils/validation'

// Middleware (tiền xử lý response và request): đóng vai trò là cầu nối giữa người dùng và phần nhân của hệ thống
// là trung gian của req/res và các xử lý logic bên trong web server
// Middleware sau khi được thiết lập, các req từ phía người dùng khi gửi lên ExpressJS sẽ
// thực hiện lần lượt qua các hàm Middleware cho đến khi trả về response cho người dùng
// Các hàm này có thể truy cập đến các đối tượng request, response, hàm Middleware tiếp theo - next
// và đối tượng lỗi - err nếu cần thiết
export const loginValidator = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing email or password'
    })
  }
  // Một hàm Mdw sau khi hoạt động xong, nếu chưa phải là cuối cùng trong chuỗi các hàm cần thực hiện
  // sẽ cần gọi đến method next() để chuyển sang hàm tiếp theo, bằng không xử lý sẽ bị treo tại hàm đó
  next()
}

export const registerValidator = validate(
  checkSchema({
    // Body: name
    name: {
      // ~ isRequired
      notEmpty: {
        errorMessage: 'Name is required!'
      },
      isString: {
        errorMessage: 'Name must be string'
      },
      // Plugin max and min
      isLength: {
        options: {
          min: 1,
          max: 255
        },
        errorMessage: 'Name must be between 1 and 255 characters long'
      },
      // Make 'name' data not a space chars
      trim: true
    },
    email: {
      notEmpty: {
        errorMessage: 'Email is required!'
      },
      isEmail: {
        errorMessage: 'Email invalid!'
      },
      trim: true,
      custom: {
        options: async (value, { req }) => {
          const email = await usersService.checkIsEmail(value)
          if (email) {
            // throw ra 1 lỗi, đồng thời tạo ra 1 đối tượng được tạo ra từ ErrorWithStatus và xuất ra lỗi
            throw new ErrorWithStatus({message: 'Email already exist!', status: 401})
          }
          return true
        }
      }
    },
    password: {
      notEmpty: {
        errorMessage: 'Password is required!'
      },
      isString: {
        errorMessage: 'Password must be string'
      },
      isLength: {
        options: {
          min: 6
        },
        errorMessage: 'Password must be at least 6 characters long'
      },
      isStrongPassword: {
        // errorMessage: '',
        options: {
          minLength: 6,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1
          // returnScore: true,
        },
        errorMessage: "Password isn't strong enough"
      }
    },
    confirm_password: {
      notEmpty: {
        errorMessage: 'Confirm Password is required'
      },
      isString: {
        errorMessage: 'Confirm Password must be string'
      },
      isLength: {
        options: {
          min: 6
        },
        errorMessage: 'Confirm Password must be at least 6 characters long'
      },
      isStrongPassword: {
        options: {
          minLength: 6,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1
          // returnScore: true,
        },
        errorMessage: "Confirm Password isn't strong enough"
      },
      // custom là 1 tuỳ chọn (optional) cho các quy tắc kiểm tra trong checkSchema. Nó cho phép bạn xác định
      // 1 hàm (function) kiểm tra tuỳ chỉnh để kiểm tra các điều kiện không phù hợp với các quy tắc kiểm tra
      // tiêu chuẩn
      custom: {
        // 2 tham số trong hàm:
        //  + value: là giá trị của trường đang được kiểm tra
        //  + req: là đối tượng request của Express
        options: (value, { req }) => {
          // console.log(value)

          if (value !== req.body.password) {
            // throw new Error ~~ errorMesage
            throw new Error('Password Confirmation does not match Password!')
          }
          return true
        }
      }
    },
    date_of_birth: {
      isISO8601: {
        options: {
          strict: true,
          strictSeparator: true
        }
      },
      errorMessage: 'Date of birth must be ISO8601'
    }
  })
)
