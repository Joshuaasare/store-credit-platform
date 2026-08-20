import { createApiClient, ApiClientConfig } from "./apiService.js";

// No Supabase keys on the client: the backend mints short-lived signed URLs
// with the service-role key; this service PUTs the file directly to that URL.

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

export function createStorageService(config?: ApiClientConfig) {
  const { apiRequest } = createApiClient(config);

  async function getUploadUrl(
    req: CreateUploadUrlRequest,
  ): Promise<UploadUrlData> {
    const res = await apiRequest<ApiSuccess<UploadUrlData> | ApiError>(
      "/storage/upload-url",
      { method: "POST", body: req },
    );
    return unwrap(res);
  }

  // PUTs directly to Supabase Storage via the signed URL — bypasses apiRequest.
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

  async function getDownloadUrl(
    req: CreateDownloadUrlRequest,
  ): Promise<string> {
    const res = await apiRequest<ApiSuccess<{ url: string }> | ApiError>(
      "/storage/download-url",
      { method: "POST", body: req },
    );
    return unwrap(res).url;
  }

  async function deleteFiles(req: DeleteStorageRequest): Promise<boolean> {
    const res = await apiRequest<ApiSuccess<{ deleted: boolean }> | ApiError>(
      "/storage/delete",
      { method: "POST", body: req },
    );
    return unwrap(res).deleted;
  }

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
