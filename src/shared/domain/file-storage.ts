export type CreateUploadUrlInput = {
  key: string;
  contentType: string;
  size: number;
};

/** アップロードのときは、`headers` をすべてそのまま付けて PUT する。署名に含まれているので、欠けたり値が違ったりすると拒否される。 */
export type UploadUrl = {
  url: string;
  headers: Record<string, string>;
};

export type FileStorage = {
  createUploadUrl: (input: CreateUploadUrlInput) => Promise<UploadUrl>;
  createDownloadUrl: (key: string) => Promise<string>;
};
