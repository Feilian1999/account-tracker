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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

// UUID-based Sync (Anonymous/Manual)
export const pushSyncByUUID = async (uuid: string, data: Record<string, unknown>) => {
  return api.post("/sync/push-uuid", { uuid, ...data });
};

export const pullSyncByUUID = async (uuid: string) => {
  return api.get(`/sync/pull-uuid/${uuid}`);
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
