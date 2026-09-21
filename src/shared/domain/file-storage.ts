export type CreateUploadUrlInput = {
  key: string;
  contentType: string;
  size: number;
};

export type FileStorage = {
  createUploadUrl: (input: CreateUploadUrlInput) => Promise<string>;
  createDownloadUrl: (key: string) => Promise<string>;
};
