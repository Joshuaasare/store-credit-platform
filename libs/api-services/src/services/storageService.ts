import { createApiClient } from "./apiService.js";

/**
 * Storage service — talks to the backend storage endpoints. No Supabase keys
 * are used on the client: the backend mints short-lived signed URLs with the
 * service-role key, and this service PUTs the (optionally compressed) file
 * directly to that signed URL. Compression stays in the webapp.
 */

export interface CreateUploadUrlRequest {
  bucket: string;
  folder?: string;
  id?: string | number;
  contentType: string;
  upsert?: boolean;
  expiresIn?: number;
}

export interface UploadUrlData {
  path: string;
  signedUrl: string;
  publicUrl: string;
}

export interface CreateDownloadUrlRequest {
  bucket: string;
  path: string;
  expiresIn?: number;
}

export interface DeleteStorageRequest {
  bucket: string;
  paths?: string[];
  url?: string;
}

export interface UploadFileOptions {
  bucket: string;
  folder?: string;
  id?: string | number;
  /** Defaults to the File's detected type, or application/octet-stream. */
  contentType?: string;
  upsert?: boolean;
  expiresIn?: number;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}
interface ApiError {
  success: false;
  error: string;
}

function unwrap<T>(res: ApiSuccess<T> | ApiError): T {
  if (!res.success) throw new Error(res.error);
  return res.data;
}

export function createStorageService() {
  const { apiRequest } = createApiClient();

  /** POST /storage/upload-url — mint a short-lived signed upload URL + public URL. */
  async function getUploadUrl(
    req: CreateUploadUrlRequest,
  ): Promise<UploadUrlData> {
    const res = await apiRequest<ApiSuccess<UploadUrlData> | ApiError>(
      "/storage/upload-url",
      { method: "POST", body: req },
    );
    return unwrap(res);
  }

  /**
   * PUT the file body to a signed upload URL. This hits Supabase Storage
   * directly (the signed URL is the auth); it does not go through apiRequest.
   */
  async function uploadToSignedUrl(
    signedUrl: string,
    body: Blob,
    contentType: string,
  ): Promise<void> {
    const res = await fetch(signedUrl, {
      method: "PUT",
      body,
      headers: { "Content-Type": contentType },
    });
    if (!res.ok) {
      throw new Error(`Upload to signed URL failed with status ${res.status}`);
    }
  }

  /**
   * Convenience: mint a signed URL and PUT the (optionally pre-compressed)
   * file in one call. Returns the object path and public URL.
   */
  async function uploadFile(
    file: File | Blob,
    options: UploadFileOptions,
  ): Promise<{ path: string; publicUrl: string }> {
    const contentType =
      options.contentType ??
      (file instanceof File ? file.type : "application/octet-stream");
    const { path, signedUrl, publicUrl } = await getUploadUrl({
      bucket: options.bucket,
      folder: options.folder,
      id: options.id,
      contentType,
      upsert: options.upsert,
      expiresIn: options.expiresIn,
    });
    await uploadToSignedUrl(signedUrl, file, contentType);
    return { path, publicUrl };
  }

  /** POST /storage/download-url — mint a short-lived signed download URL. */
  async function getDownloadUrl(
    req: CreateDownloadUrlRequest,
  ): Promise<string> {
    const res = await apiRequest<ApiSuccess<{ url: string }> | ApiError>(
      "/storage/download-url",
      { method: "POST", body: req },
    );
    return unwrap(res).url;
  }

  /** POST /storage/delete — delete by paths or by a single public URL. */
  async function deleteFiles(req: DeleteStorageRequest): Promise<boolean> {
    const res = await apiRequest<ApiSuccess<{ deleted: boolean }> | ApiError>(
      "/storage/delete",
      { method: "POST", body: req },
    );
    return unwrap(res).deleted;
  }

  /** GET /storage/public-url?bucket=&path= — public URL (no network call server-side). */
  async function getPublicUrl(bucket: string, path: string): Promise<string> {
    const res = await apiRequest<ApiSuccess<{ publicUrl: string }> | ApiError>(
      `/storage/public-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`,
      { method: "GET" },
    );
    return unwrap(res).publicUrl;
  }

  return {
    getUploadUrl,
    uploadToSignedUrl,
    uploadFile,
    getDownloadUrl,
    deleteFiles,
    getPublicUrl,
  };
}

export type StorageService = ReturnType<typeof createStorageService>;
