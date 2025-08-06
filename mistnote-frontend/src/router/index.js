import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import WelcomeView from '../views/WelcomeView.vue'
import LoginView from '../views/LoginView.vue'
import LoginWindow from '../views/LoginWindow.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    redirect: '/chat'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginWindow
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('../views/ChatView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/contacts',
    name: 'contacts',
    component: () => import('../views/ContactsView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  // 如果是登录窗口，直接允许访问
  if (to.path === '/login') {
    next()
    return
  }
  
  // 检查是否需要认证
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    // 防止无限重定向：如果已经在目标路由，就不再重定向
    if (to.path === '/chat') {
      next()
    } else {
      next('/chat')
    }
  } else {
    next()
  }
})

export default router
