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

/** `generation` は、ファイルが上書きされるたびに変わる。読んだあとに差し替えられていないことを、`move` で確かめるのに使う。 */
export type FileHead = {
  bytes: Uint8Array;
  contentType: string;
  size: number;
  generation: string;
};

export type FileStorage = {
  createUploadUrl: (input: CreateUploadUrlInput) => Promise<UploadUrl>;
  createDownloadUrl: (key: string) => Promise<string>;
  /** ファイルの先頭の `length` バイトと、保存されている種類・サイズ・世代を返す。ファイルがなければ `null`。 */
  readHead: (input: {
    key: string;
    length: number;
  }) => Promise<FileHead | null>;
  /** `generation` の世代のファイルを `to` へ移す。その世代がもうない（上書きされた・消された）ときは移さずに `false` を返す。 */
  move: (input: {
    from: string;
    to: string;
    generation: string;
  }) => Promise<boolean>;
  /** ファイルがなければ何もしない。 */
  delete: (key: string) => Promise<void>;
};
