import { JwtPayload } from 'jsonwebtoken'
import { TokenType } from '~/constants/enums'

// Custom lại những properties request truyền vào trong thẻ body
export interface RegisterReqBody {
  name: string
  email: string
  password: string
  confirm_password: string
  date_of_birth: string
}

export type LogoutReqBody = {
  refresh_token: string
}

export interface TokenPayload extends JwtPayload {
  user_id: string
  token_type: TokenType
}
