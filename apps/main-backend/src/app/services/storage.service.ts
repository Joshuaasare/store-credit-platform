import { supabaseAdmin } from "../utils/supabase.client";

/**
 * Storage service — generates short-lived presigned URLs and deletes objects
 * using the service-role client. Keys never leave the server; the frontend
 * receives only signed URLs (and the public URL for reads).
 *
 * NOTE: path-level ownership checks (e.g. that a given staff member may only
 * write under their merchant's folder) are deferred. Buckets should be
 * organised by folder convention (e.g. `merchant-<id>/avatars/...`) and RLS
 * policies applied at the storage-bucket level for hard isolation.
 */

export interface CreateUploadUrlInput {
  bucket: string;
  folder?: string;
  id?: string | number;
  contentType: string;
  upsert?: boolean;
  expiresIn?: number;
}

export interface UploadUrlResult {
  path: string;
  signedUrl: string;
  publicUrl: string;
}

function mimeToExtension(contentType: string): string {
  if (contentType === "image/jpeg" || contentType === "image/jpg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "bin";
}

function buildPath(
  contentType: string,
  folder: string | undefined,
  id: string | number | undefined,
): string {
  const ext = mimeToExtension(contentType);
  const timestamp = Date.now();
  const fileName = id ? `${id}_${timestamp}.${ext}` : `${timestamp}.${ext}`;
  return folder ? `${folder}/${fileName}` : fileName;
}

export function extractPathFromUrl(bucket: string, publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split(`/${bucket}/`);
    return parts.length >= 2 ? parts[1] : null;
  } catch {
    return null;
  }
}

export const storageService = {
  /**
   * Create a short-lived signed upload URL. The frontend PUTs the file
   * directly to this URL; no keys are exposed.
   */
  async createUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrlResult> {
    const path = buildPath(input.contentType, input.folder, input.id);

    const { data, error } = await supabaseAdmin.storage
      .from(input.bucket)
      .createSignedUploadUrl(path, {
        upsert: input.upsert ?? false,
      });

    if (error) throw error;

    const publicUrl = supabaseAdmin.storage
      .from(input.bucket)
      .getPublicUrl(path).data.publicUrl;

    return {
      path: data.path,
      signedUrl: data.signedUrl,
      publicUrl,
    };
  },

  /** Create a short-lived signed download URL for a private object. */
  async createDownloadUrl(
    bucket: string,
    path: string,
    expiresIn = 60,
  ): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },

  /** Delete one or more objects by their bucket-relative paths. */
  async deleteFiles(bucket: string, paths: string[]): Promise<void> {
    const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
    if (error) throw error;
  },

  /** Delete a single object by its public URL. Returns false if the URL is invalid. */
  async deleteFileByUrl(bucket: string, publicUrl: string): Promise<boolean> {
    const path = extractPathFromUrl(bucket, publicUrl);
    if (!path) return false;
    await this.deleteFiles(bucket, [path]);
    return true;
  },

  /** Public URL for an object (no network call — just URL construction). */
  getPublicUrl(bucket: string, path: string): string {
    return supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },
};
