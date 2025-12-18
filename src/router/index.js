import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'

const createHistory = import.meta.env.VITE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory

const router = createRouter({
  scrollBehavior: () => ({ left: 0, top: 0 }),
  routes,
  history: createHistory(import.meta.env.BASE_URL)
})

export default router
