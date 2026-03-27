<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col pt-12">
    <!-- Main Content -->
    <main class="flex-grow flex flex-col items-center px-6">
      <!-- App Icon -->
      <div class="mb-8 w-32 h-32 rounded-3xl overflow-hidden shadow-2xl shadow-violet-500/20 transform transition hover:scale-105 duration-300">
        <img src="/magic-sheep.png" alt="Magic Sheep" class="w-full h-full object-cover" />
      </div>

      <!-- Hero Section -->
      <div class="text-center w-full max-w-md space-y-4 mb-12">
        <h1 class="text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
          {{ $t('landing.title') }}
        </h1>
        <h2 class="text-xl font-medium text-violet-600 dark:text-violet-400">
          {{ $t('landing.subtitle') }}
        </h2>
        <p class="text-gray-500 dark:text-gray-400 leading-relaxed mt-4">
          {{ $t('landing.description') }}
        </p>
      </div>

      <!-- Feature Highlights -->
      <div class="w-full max-w-md space-y-4 mb-12">
        <div class="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div class="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined text-blue-500 dark:text-blue-400">person</span>
          </div>
          <span class="font-medium text-gray-800 dark:text-gray-200">{{ $t('landing.features.personal') }}</span>
        </div>
        
        <div class="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div class="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined text-green-500 dark:text-green-400">group</span>
          </div>
          <span class="font-medium text-gray-800 dark:text-gray-200">{{ $t('landing.features.group') }}</span>
        </div>

        <div class="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div class="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined text-amber-500 dark:text-amber-400">cloud_sync</span>
          </div>
          <span class="font-medium text-gray-800 dark:text-gray-200">{{ $t('landing.features.sync') }}</span>
        </div>
      </div>

      <!-- CTA Button -->
      <div class="w-full max-w-md mt-auto mb-10">
        <button 
          @click="goToLogin" 
          class="w-full py-4 px-6 bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 text-white font-bold rounded-2xl shadow-lg shadow-violet-600/20 transform transition active:scale-95 flex items-center justify-center gap-2"
        >
          <span>{{ $t('landing.getStarted') }}</span>
          <span class="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    </main>

    <!-- Footer for Legal Links -->
    <footer class="w-full py-6 text-center border-t border-gray-200 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <div class="flex justify-center items-center gap-6 text-sm">
        <router-link to="/privacy" class="text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 font-medium transition">
          {{ $t('privacy.title') }}
        </router-link>
        <span class="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
        <router-link to="/terms" class="text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 font-medium transition">
          {{ $t('terms.title') }}
        </router-link>
      </div>
      <p class="mt-4 text-xs text-gray-400 dark:text-gray-500">
        &copy; {{ new Date().getFullYear() }} Account Tracker. All rights reserved.
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useTrackerStore } from '../stores/tracker'
import { onMounted } from 'vue'

const router = useRouter()
const store = useTrackerStore()

onMounted(() => {
  // If user is already logged in, redirect them seamlessly to dashboard
  if (store.userProfile.isLoggedIn && store.isProfileSet) {
    router.replace('/dashboard')
  }
})

const goToLogin = () => {
  router.push('/login')
}
</script>
