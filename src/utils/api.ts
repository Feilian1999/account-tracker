import axios from "axios";
import type { SharedBookPayload, ShareResponse } from "../stores/types";

// 建立 Axios 實例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    try {
      const profileRaw = localStorage.getItem('tracker_user_profile');
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile.authToken) {
          config.headers.Authorization = `Bearer ${profile.authToken}`;
        }
      }
    } catch (e) {
      console.error("Failed to parse profile for auth token", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

// Sync APIs
export const pushSyncData = async (data: Record<string, unknown>) => {
  return api.post("/sync/push", data);
};

export const pullSyncData = async () => {
  return api.get("/sync/pull");
};

// Shared Books
export const shareBookToCloud = async (payload: SharedBookPayload) => {
  return api.post<ShareResponse>("/shared/share", payload);
};

export const fetchSharedBook = async (code: string) => {
  return api.get<SharedBookPayload>(`/shared/${code}`);
};

export const updateSharedBook = async (code: string, payload: SharedBookPayload) => {
  return api.put(`/shared/${code}`, payload);
};

export default api;
