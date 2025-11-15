import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator } from '#validators/register'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import { loginValidator } from '#validators/login'

export default class AuthController {
  public async register({ request, response }: HttpContext) {

    const payload = await request.validateUsing(registerValidator)

    const emailExists = await User.findBy('email', payload.email)
    if (emailExists) {
      return response.badRequest({ error: 'Email already used' })
    }

    const nickExists = await User.findBy('nickname', payload.nickname)
    if (nickExists) {
      return response.badRequest({ error: 'Nickname already used' })
    }

    const user = await User.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      nickname: payload.nickname,
      email: payload.email,
      password: payload.password,
    })

    return response.created({
      message: 'User registered',
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
      },
    })
  }
    public async login({ request, response }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)

    const user = await User.findBy('email', payload.email)
    if (!user) {
      return response.unauthorized({ error: 'Invalid email or password' })
    }

    const isPasswordValid = await hash.verify(user.password, payload.password)
    if (!isPasswordValid) {
      return response.unauthorized({ error: 'Invalid email or password' })
    }

    const token = await User.accessTokens.create(user)

    return {
      message: 'Logged in',
      token: token.value!.release(),
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
      },
    }
  }
}
