<script setup>
import { provide, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { request } from './api'

const route = useRoute()
const settings = reactive({ currency_code: 'USD', date_format: 'MM/DD/YYYY' })
provide('settings', settings)
const theme = ref(localStorage.getItem('spends-theme') || 'light')
provide('theme', theme)
watch(theme, value => {
  document.documentElement.dataset.theme = value
  localStorage.setItem('spends-theme', value)
}, { immediate: true })
request('/settings/').then(value => Object.assign(settings, value)).catch(() => {})
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <RouterLink to="/" class="brand"><span class="brand-symbol">◈</span><span>spends<span class="brand-muted">tracker</span></span></RouterLink>
      <div class="nav-label">WORKSPACE</div>
      <nav class="side-links" aria-label="Main navigation">
        <RouterLink to="/" exact-active-class="selected"><span class="nav-icon">⌂</span>Overview</RouterLink>
        <RouterLink to="/purchases" :class="{ selected: route.path.startsWith('/purchases') }"><span class="nav-icon">▦</span>Purchases</RouterLink>
        <RouterLink to="/marketplace" active-class="selected"><span class="nav-icon">▤</span>Marketplace</RouterLink>
        <RouterLink to="/insights" active-class="selected"><span class="nav-icon">◫</span>Insights</RouterLink>
      </nav>
      <div class="sidebar-bottom">
        <RouterLink to="/settings" active-class="selected"><span class="nav-icon">⚙</span>Settings & data</RouterLink>
        <button type="button" class="theme-button" @click="theme = theme === 'light' ? 'dark' : 'light'">
          <span class="nav-icon">{{ theme === 'light' ? '☾' : '☀' }}</span>{{ theme === 'light' ? 'Dark mode' : 'Light mode' }}
        </button>
        <div class="app-caption">Your purchases, in one place.</div>
      </div>
    </aside>
    <div class="workspace">
      <header class="mobile-header">
        <RouterLink to="/" class="brand"><span class="brand-symbol">◈</span><span>spends<span class="brand-muted">tracker</span></span></RouterLink>
        <RouterLink to="/purchases/new" class="button primary small">+ Add</RouterLink>
      </header>
      <main id="main"><RouterView /></main>
    </div>
    <nav class="bottom-nav" aria-label="Mobile navigation">
      <RouterLink to="/" exact-active-class="selected">⌂<span>Home</span></RouterLink>
      <RouterLink to="/purchases" :class="{ selected: route.path.startsWith('/purchases') }">▦<span>Purchases</span></RouterLink>
      <RouterLink to="/marketplace" active-class="selected">▤<span>Marketplace</span></RouterLink>
      <RouterLink to="/insights" active-class="selected">◫<span>Insights</span></RouterLink>
      <RouterLink to="/settings" active-class="selected">⚙<span>Settings</span></RouterLink>
    </nav>
  </div>
</template>
