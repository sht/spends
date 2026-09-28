import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Purchases from './views/Purchases.vue'
import Marketplace from './views/Marketplace.vue'
import PurchaseDetail from './views/PurchaseDetail.vue'
import PurchaseForm from './views/PurchaseForm.vue'
import Insights from './views/Insights.vue'
import Settings from './views/Settings.vue'
import './styles.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/purchases', component: Purchases },
    { path: '/marketplace', component: Marketplace },
    { path: '/purchases/new', component: PurchaseForm },
    { path: '/purchases/:id/edit', component: PurchaseForm },
    { path: '/purchases/:id', component: PurchaseDetail },
    { path: '/insights', component: Insights },
    { path: '/settings', component: Settings },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() { return { top: 0 } },
})

createApp(App).use(router).mount('#app')
