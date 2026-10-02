import "client-only";
import type { UploadTarget } from "@/modules/post/application/create-upload-urls";

/** 署名付きの URL へ直接 PUT する。ヘッダーは署名に含まれているので、渡されたものをそのまま付ける。通信できない・拒否されたときは `false`。 */
export async function uploadFile({
  target,
  body,
}: {
  target: UploadTarget;
  body: Blob;
}): Promise<boolean> {
  try {
    const response = await fetch(target.uploadUrl, {
      method: "PUT",
      headers: target.uploadHeaders,
      body,
    });
    return response.ok;
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}
