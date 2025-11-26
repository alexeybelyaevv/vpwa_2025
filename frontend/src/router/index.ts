import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach((to, from, next) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const isAuthRoute = ['/login', '/register'].includes(to.path);
    const requiresAuth = to.matched.some((record) => record.path.startsWith('/workspace'));

    if (!token && requiresAuth) {
      next({ path: '/login', replace: true });
      return;
    }

    if (token && isAuthRoute) {
      next({ path: '/workspace', replace: true });
      return;
    }

    next();
  });

  return Router;
});
