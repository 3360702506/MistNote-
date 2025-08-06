import { createRouter, createWebHistory } from 'vue-router'
import ChatView from '../views/ChatView.vue'
import WelcomeView from '../views/WelcomeView.vue'
import ContactsView from '../views/ContactsView.vue'

const routes = [
  {
    path: '/',
    name: 'welcome',
    component: WelcomeView
  },
  {
    path: '/chat',
    name: 'chat',
    component: ChatView
  },
  {
    path: '/contacts',
    name: 'contacts',
    component: ContactsView
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
