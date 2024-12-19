import { Request, Response, NextFunction } from 'express'
import { checkSchema } from 'express-validator'
import { JsonWebTokenError } from 'jsonwebtoken'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import databaseService from '~/services/database.services'
import usersService from '~/services/users.services'
import hashPassword from '~/utils/crypto'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'
import { capitalize } from 'lodash'
import { TokenPayload } from '~/models/requests/User.requests'
import { ObjectId } from 'mongodb'
import { UserVerifyStatus } from '~/constants/enums'
import { REGEX_USERNAME } from '~/constants/regex'
import { verifyAccessToken } from '~/utils/common'

// Middleware (tiền xử lý response và request): đóng vai trò là cầu nối giữa người dùng và phần nhân của hệ thống
// là trung gian của req/res và các xử lý logic bên trong web server
// Middleware sau khi được thiết lập, các req từ phía người dùng khi gửi lên ExpressJS sẽ
// thực hiện lần lượt qua các hàm Middleware cho đến khi trả về response cho người dùng
// Các hàm này có thể truy cập đến các đối tượng request, response, hàm Middleware tiếp theo - next
// và đối tượng lỗi - err nếu cần thiết
export const loginValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: 'Email is required!'
        },
        isEmail: {
          errorMessage: 'Email invalid!'
        },
        trim: true,
        // props custom này dùng để tuỳ chỉnh và sử dụng các phương thức hoặc hàm để xử lý đầu vào, và xuất ra lỗi đầu ra theo
        // ý muốn của dev
        custom: {
          // options:là 1 callback chứa 2 tham số là value (value này là value được nhập vào từ trường email được gửi đến bên phía client)
          // và {req}
          options: async (value, { req }) => {
            // Lúc này, sử dụng
            const user = await databaseService.users.findOne(
              {
                email: value,
                password: hashPassword(req.body.password)
              },
              {
                projection: {
                  password: 0,
                  email_verify_token: 0,
                  forgot_password_token: 0
                }
              }
            )
            if (user === null) {
              // throw ra 1 lỗi, đồng thời tạo ra 1 đối tượng được tạo ra từ ErrorWithStatus và xuất ra lỗi
              // Khi sử dụng throw, mặc định nó sẽ xuất ra lỗi, chạy ra file index.ts và nhảy vào defaultErrorHandler để trả về lỗi
              throw new Error("Email or password isn't correct")
            }
            // Ghi đè thêm thuộc tính user cho req -> xử lý bên phía controller
            req.user = user
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
        }
      }
    },
    ['body']
  )
)

export const registerValidator = validate(
  checkSchema(
    {
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
        // props custom này dùng để tuỳ chỉnh và sử dụng các phương thức hoặc hàm để xử lý đầu vào, và xuất ra lỗi đầu ra theo
        // ý muốn của dev
        custom: {
          // options:là 1 callback chứa 2 tham số là value (value này là value được nhập vào từ trường email được gửi đến bên phía client)
          // và {req}
          options: async (value, { req }) => {
            // Lúc này, sử dụng
            const email = await usersService.checkIsEmail(value)
            console.log(email)

            if (email) {
              // throw ra 1 lỗi, đồng thời tạo ra 1 đối tượng được tạo ra từ ErrorWithStatus và xuất ra lỗi
              // Khi sử dụng throw, mặc định nó sẽ xuất ra lỗi, chạy ra file index.ts và nhảy vào defaultErrorHandler để trả về lỗi
              throw new ErrorWithStatus({ message: 'Email already exist!', status: 401 })
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
    },
    ['body']
  )
)

// Tham số thứ 2 của method checkSchema sẽ là khu vực mà mình muốn lấy ra để xử lý validation,
// tránh trường hợp kiểm tra và lẩy ra toàn bộ các dữ liệu truyền lên server -> tối ưu performance
export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        trim: true,
        custom: {
          // Nếu có thì sẽ nhảy vào đây và sẽ được gán dưới biến là 'value'
          options: async (value, { req }) => {
            // Lấy ra accessToken từ authorization
            const access_token = value.split(' ')[1]
            return await verifyAccessToken(access_token, req as Request)
          }
        }
      }
    },
    ['headers']
  )
)

export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        trim: true,
        custom: {
          // Nếu có thì sẽ nhảy vào đây và sẽ được gán dưới biến là 'value'
          options: async (value, { req }) => {
            // Kiểm tra trong req có tồn tại RefreshToken không
            if (!value) {
              throw new ErrorWithStatus({
                message: 'RefreshToken is required!',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            try {
              // Xử lý bất đồng bộ
              const [decode_refresh_token, refresh_token] = await Promise.all([
                verifyToken({ token: value, secretOnPublicKey: process.env.JWT_SECRET_REFRESH_TOKEN as string }),
                databaseService.refreshTokens.findOne({ token: value })
              ])
              if (!refresh_token) {
                throw new ErrorWithStatus({
                  message: 'Refresh Token have been used or not exist',
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              // const decode_refresh_token = await verifyToken({ token: value })
              ;(req as Request).decode_refresh_token = decode_refresh_token
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: capitalize(error.message),
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              throw error
            }
          }
        }
      }
    },
    ['body']
  )
)

export const emailVerifyTokenValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        trim: true,
        custom: {
          // Nếu có thì sẽ nhảy vào đây và sẽ được gán dưới biến là 'value'
          options: async (value, { req }) => {
            // Kiểm tra trong req có tồn tại EmailVerifyToken không
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Email Verify Token is required!',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            try {
              const decode_verify_email_token = await verifyToken({
                token: value,
                secretOnPublicKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
              })
              ;(req as Request).decode_verify_email_token = decode_verify_email_token
              // console.log("Hellooooooooo");
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: capitalize(error.message),
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              throw error
            }
          }
        }
      }
    },
    ['body']
  )
)

export const forgotPasswordValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: 'Email is required!'
        },
        isEmail: {
          errorMessage: 'Email is invalid'
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            const user = await databaseService.users.findOne({
              email: value
            })
            if (!user) {
              throw new ErrorWithStatus({ message: 'Email is not exist!', status: HTTP_STATUS.NOT_FOUND })
            }
            req.user = user
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const verifyForgotPasswordTokenValidator = validate(
  checkSchema(
    {
      forgot_password_token: {
        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Forgot password token is required!',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            try {
              const decode_forgot_password_token = await verifyToken({
                token: value,
                secretOnPublicKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string
              })
              const { user_id } = decode_forgot_password_token
              const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
              if (user === null) {
                throw new ErrorWithStatus({
                  message: 'User not found',
                  status: HTTP_STATUS.NOT_FOUND
                })
              }
              if (user.forgot_password_token !== value) {
                throw new ErrorWithStatus({
                  message: 'Forgot Password Token is invalid!',
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
            } catch (error) {
              // JsonWebTokenError này sẽ là lỗi của thằng jwt trả về khi mà method verifyToken lỗi (invalid, expired,...) về token
              // thì sẽ cho nó là errorStatus: 401 -> để tránh trường hợp trả về lỗi 422 (Validation)
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: capitalize(error.message),
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              throw error
            }
          }
        }
      }
    },
    ['body']
  )
)

export const resetPasswordValidator = validate(
  checkSchema(
    {
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
      forgot_password_token: {
        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Forgot password token is required!',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            try {
              const decode_forgot_password_token = await verifyToken({
                token: value,
                secretOnPublicKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string
              })
              const { user_id } = decode_forgot_password_token
              const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
              if (user === null) {
                throw new ErrorWithStatus({
                  message: 'User not found',
                  status: HTTP_STATUS.NOT_FOUND
                })
              }
              if (user.forgot_password_token !== value) {
                throw new ErrorWithStatus({
                  message: 'Forgot Password Token is invalid!',
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              ;(req as Request).decode_forgot_password_token = decode_forgot_password_token
            } catch (error) {
              // JsonWebTokenError này sẽ là lỗi của thằng jwt trả về khi mà method verifyToken lỗi (invalid, expired,...) về token
              // thì sẽ cho nó là errorStatus: 401 -> để tránh trường hợp trả về lỗi 422 (Validation)
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: capitalize(error.message),
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              throw error
            }
          }
        }
      }
    },
    ['body']
  )
)

// Kiểm tra tài khoản đã được verify email hay chưa
export const verifiedUserValidatior = async (req: Request, res: Response, next: NextFunction) => {
  // TokenPayload là kiểu dữ liệu mà jwt package trả về
  const { verify } = req.decode_authorization as TokenPayload
  if (verify !== UserVerifyStatus.Verified) {
    next(
      new ErrorWithStatus({
        message: 'User not verified',
        status: HTTP_STATUS.FORBIDDEN
      })
    )
  }
  next()
}

export const updateMeValidator = validate(
  checkSchema(
    {
      name: {
        optional: true, // không truyền thì không check, truyền mới check:)
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
        }
      },
      date_of_birth: {
        optional: true, // không truyền thì không check, truyền mới check:)
        isISO8601: {
          options: {
            strict: true,
            strictSeparator: true
          }
        },
        errorMessage: 'Date of birth must be ISO8601'
      },
      bio: {
        optional: true, // không truyền thì không check, truyền mới check:)
        isString: {
          errorMessage: 'Bio must be string'
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: 'Bio length must be from 1 to 200'
        }
      },
      location: {
        optional: true, // không truyền thì không check, truyền mới check:)
        isString: {
          errorMessage: 'Location must be string'
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: 'Location length must be from 1 to 200'
        }
      },
      website: {
        optional: true, // không truyền thì không check, truyền mới check:)
        isString: {
          errorMessage: 'Website must be string'
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 400
          },
          errorMessage: 'Website length must be from 1 to 400'
        }
      },
      username: {
        optional: true, // không truyền thì không check, truyền mới check:)
        isString: {
          errorMessage: 'Username must be string'
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!REGEX_USERNAME.test(value) === false) {
              throw new Error(
                'Username must be 4-15 characters long and contain only letters, number, underscores and not only number'
              )
            }
            const user = await databaseService.users.findOne({ username: value })
            // Nếu đã tồn tại username này trong DB thì chúng ta không cho phép update
            if (user && user?._id.toHexString() !== req.decode_authorization?.user_id) {
              throw Error('Username existed!')
            }
          }
        }
      },
      avatar: {
        optional: true, // không truyền thì không check, truyền mới check:)
        isString: {
          errorMessage: 'Avatar must be string'
        },
        trim: true,

        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: 'Avatar length must be from 1 to 200'
        }
      },
      cover_photo: {
        optional: true, // không truyền thì không check, truyền mới check:)
        isString: {
          errorMessage: 'Cover Photo must be string'
        },
        trim: true,

        isLength: {
          options: {
            min: 1,
            max: 400
          },
          errorMessage: 'Cover Photo length must be from 1 to 400'
        }
      }
    },
    ['body']
  )
)

export const followValidator = validate(
  checkSchema(
    {
      followed_user_id: {
        // isString: true,
        custom: {
          options: async (value: string, { req }) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: 'ID followed_user_id invalid',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            const followed_user = databaseService.users.findOne({
              _id: new ObjectId(value)
            })
            if (followed_user === null) {
              throw new ErrorWithStatus({
                message: 'User not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
          }
        }
      }
    },
    ['body']
  )
)

export const getConversationValidator = validate(
  checkSchema(
    {
      receiver_id: {
        // isString: true,
        custom: {
          options: async (value: string, { req }) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: 'ID followed_user_id invalid',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            const followed_user = databaseService.users.findOne({
              _id: new ObjectId(value)
            })
            if (followed_user === null) {
              throw new ErrorWithStatus({
                message: 'User not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
          }
        }
      }
    },
    ['query']
  )
)
export const unfollowValidator = validate(
  checkSchema(
    {
      user_id: {
        custom: {
          options: async (value: string, { req }) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: 'user_id invalid',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
            const followed_user = databaseService.users.findOne({
              _id: new ObjectId(value)
            })
            if (followed_user === null) {
              throw new ErrorWithStatus({
                message: 'User not found',
                status: HTTP_STATUS.NOT_FOUND
              })
            }
          }
        }
      }
    },
    ['params']
  )
)
export const changePasswordValidator = validate(
  checkSchema(
    {
      old_password: {
        notEmpty: {
          errorMessage: 'Field old password is required!'
        },
        isString: {
          errorMessage: 'Old password must be string'
        },
        custom: {
          options: async (value, { req }) => {
            const { user_id } = (req as Request).decode_authorization as TokenPayload
            const user = await databaseService.users.findOne({
              _id: new ObjectId(user_id)
            })
            if (user === null) {
              throw new ErrorWithStatus({ message: 'User not found!', status: HTTP_STATUS.NOT_FOUND })
            }
            const { password } = user
            const isMatched = hashPassword(value) === password
            if (!isMatched) {
              throw new ErrorWithStatus({
                message: 'Old password is incorrect!',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
          }
        }
      },
      new_password: {
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
      confirm_new_password: {
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
        custom: {
          options: async (value, { req }) => {
            if (value !== req.body.new_password) {
              throw new Error('Password Confirmation does not match Password!')
            }
          }
        }
      }
    },
    ['body']
  )
)

// Validator isUserLoggedInValidator
// Tham so nhan vao la 1 middleware co 3 tham so va khong tra ve gia tri nao ca => void
export const isUserLoggedInValidator = (middleware: (req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
      return middleware(req, res, next)
    }
    next()
  }
}
