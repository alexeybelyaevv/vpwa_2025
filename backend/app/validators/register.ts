import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    firstName: vine.string().trim().minLength(2),
    lastName: vine.string().trim().minLength(2),
    nickname: vine.string().trim().minLength(2),
    email: vine.string().trim().email(),
    password: vine.string().minLength(6),
  })
)
