import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
const AuthController = () => import('#controllers/auth_controller')
const ChannelsController = () => import('#controllers/channels_controller')

router.post('/register', [AuthController, 'register'])
router.post('/login', [AuthController, 'login'])

router.group(() => {
  router.get('/user', [AuthController, 'getUser'])
  router.get('/channels', [ChannelsController, 'getChannels'])
  router.post('/channels/create', [ChannelsController, 'create'])
  router.post('/channels/join', [ChannelsController, 'join'])
}).middleware([middleware.auth()])
