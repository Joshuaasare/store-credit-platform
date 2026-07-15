import { Type, Static } from "@sinclair/typebox";

// ---------- Requests ----------

export const CreateUploadUrlRequest = Type.Object({
  bucket: Type.String({ minLength: 1 }),
  folder: Type.Optional(Type.String()),
  id: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  contentType: Type.String({ minLength: 1 }),
  upsert: Type.Optional(Type.Boolean()),
  expiresIn: Type.Optional(Type.Number()),
});
export type CreateUploadUrlRequest = Static<typeof CreateUploadUrlRequest>;

export const CreateDownloadUrlRequest = Type.Object({
  bucket: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  expiresIn: Type.Optional(Type.Number()),
});
export type CreateDownloadUrlRequest = Static<typeof CreateDownloadUrlRequest>;

export const DeleteStorageRequest = Type.Object({
  bucket: Type.String({ minLength: 1 }),
  paths: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  url: Type.Optional(Type.String()),
});
export type DeleteStorageRequest = Static<typeof DeleteStorageRequest>;

export const PublicUrlRequest = Type.Object({
  bucket: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
});
export type PublicUrlRequest = Static<typeof PublicUrlRequest>;

// ---------- Data shapes ----------

export const UploadUrlData = Type.Object({
  path: Type.String(),
  signedUrl: Type.String(),
  publicUrl: Type.String(),
});
export type UploadUrlData = Static<typeof UploadUrlData>;

export const DownloadUrlData = Type.Object({
  url: Type.String(),
});
export type DownloadUrlData = Static<typeof DownloadUrlData>;

export const PublicUrlData = Type.Object({
  publicUrl: Type.String(),
});
export type PublicUrlData = Static<typeof PublicUrlData>;

export const DeleteResultData = Type.Object({
  deleted: Type.Boolean(),
});
export type DeleteResultData = Static<typeof DeleteResultData>;

// ---------- Envelopes ----------

export const UploadUrlResponse = Type.Object({
  success: Type.Literal(true),
  data: UploadUrlData,
});

export const DownloadUrlResponse = Type.Object({
  success: Type.Literal(true),
  data: DownloadUrlData,
});

export const PublicUrlResponse = Type.Object({
  success: Type.Literal(true),
  data: PublicUrlData,
});

export const DeleteResponse = Type.Object({
  success: Type.Literal(true),
  data: DeleteResultData,
});

export const ApiErrorResponse = Type.Object({
  success: Type.Literal(false),
  error: Type.String(),
});

export type UploadUrlApiResponse = Static<typeof UploadUrlApiResponse>;
export const UploadUrlApiResponse = Type.Union([
  UploadUrlResponse,
  ApiErrorResponse,
]);

export type DownloadUrlApiResponse = Static<typeof DownloadUrlApiResponse>;
export const DownloadUrlApiResponse = Type.Union([
  DownloadUrlResponse,
  ApiErrorResponse,
]);

export type PublicUrlApiResponse = Static<typeof PublicUrlApiResponse>;
export const PublicUrlApiResponse = Type.Union([
  PublicUrlResponse,
  ApiErrorResponse,
]);

export type DeleteStorageApiResponse = Static<typeof DeleteStorageApiResponse>;
export const DeleteStorageApiResponse = Type.Union([
  DeleteResponse,
  ApiErrorResponse,
]);