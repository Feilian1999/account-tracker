import axios from "axios";
import type { SharedBookPayload, ShareResponse } from "../stores/types";
import type { Doc } from "./crdt";

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
// A full backup/restore carries every record the user owns, so it gets a longer
// budget than the 15s default: on a cold serverless start the request also pays
// for the DB connect and the migration check before any data moves.
const SYNC_TIMEOUT = 60000;

export const pushSyncByUUID = async (uuid: string, data: Record<string, unknown>) => {
  return api.post("/sync/push-uuid", { uuid, ...data }, { timeout: SYNC_TIMEOUT });
};

export const pullSyncByUUID = async (uuid: string) => {
  return api.get(`/sync/pull-uuid/${uuid}`, { timeout: SYNC_TIMEOUT });
};

// Shared Books — CRDT sync (see utils/crdt.ts and the backend's CLAUDE.md)
export interface SharedDocResponse {
  version: number;
  doc?: Doc;
  /** Only for a space still in the v1 format (never synced by a v2 client). */
  legacy?: SharedBookPayload & { deletedIds?: string[] };
  /** Fingerprint of `legacy`; sent back as `baseOf` when upgrading. */
  legacyHash?: string;
}

export const createSharedDoc = async (doc: Doc) => {
  return api.post<ShareResponse & { version: number }>("/shared/v2", { doc });
};

export const getSharedDoc = async (code: string, since = 0) => {
  return api.get<SharedDocResponse>(`/shared/v2/${code}`, { params: { since } });
};

export const syncSharedDoc = async (
  code: string,
  body: { since: number; changes: Doc; base?: Doc; baseOf?: string },
) => {
  return api.post<SharedDocResponse>(`/shared/v2/${code}/sync`, body);
};

export default api;
