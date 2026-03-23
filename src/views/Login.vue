<template>
  <div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-gray-900">
    <div class="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
      <div>
        <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Or
          <a href="#" class="font-medium text-emerald-600 hover:text-emerald-500">
            register a new account
          </a>
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="space-y-4 rounded-md shadow-sm">
          <div>
            <label for="email-address" class="sr-only">Email address</label>
            <input
              id="email-address"
              name="email"
              type="email"
              autocomplete="email"
              required
              v-model="email"
              class="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Email address"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              v-model="password"
              class="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Password"
            />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              Remember me
            </label>
          </div>

          <div class="text-sm">
            <a href="#" class="font-medium text-emerald-600 hover:text-emerald-500">
              Forgot your password?
            </a>
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-emerald-400"
          >
            <span class="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg class="h-5 w-5 text-emerald-500 group-hover:text-emerald-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" v-if="!isLoading">
                <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
              </svg>
              <!-- Loading Spinner -->
              <svg v-else class="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            {{ isLoading ? 'Signing in...' : 'Sign in' }}
          </button>
        </div>

        <div v-if="errorMessage" class="mt-4 text-center text-sm text-red-600">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="mt-4 text-center text-sm text-green-600">
          {{ successMessage }}
        </div>
      </form>
      
      <!-- Mock Google Login -->
      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Or continue with
            </span>
          </div>
        </div>

        <div class="mt-6">
          <button
            @click="handleGoogleLoginMock"
            class="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../utils/api';

const router = useRouter();
const email = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const response = await api.post('/auth/login', {
      email: email.value,
      password: password.value,
    });
    
    successMessage.value = response.data.msg || 'Login successful!';
    
    // In a real app, save token to localStorage/store here
    
    // Wait for a second and then redirect
    setTimeout(() => {
      router.push('/');
    }, 1500);
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || 'Login failed. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const handleGoogleLoginMock = () => {
  errorMessage.value = 'Google Login is not fully implemented yet.';
  // The actual implementation would redirect to Google or use a popup to get an ID token
};
</script>
