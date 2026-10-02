import { NextResponse } from "next/server";
import { getPostFileUrl } from "@/di/post";
import { signInPath } from "@/modules/auth/domain/return-path";
import { getSession } from "@/modules/auth/presentation/session";

/** 原本を開く・保存する。見てよいかを確かめてから、その場で発行した署名付きの URL へ移動させる。 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/posts/[publicId]/original">,
) {
  const { publicId } = await params;
  const session = await getSession();
  const result = await getPostFileUrl({
    publicId,
    userId: session?.user.id ?? null,
    mode: new URL(request.url).searchParams.has("download") ? "save" : "open",
  });

  if (result.ok) {
    return new NextResponse(null, {
      status: 302,
      headers: { Location: result.url, "Cache-Control": "no-store" },
    });
  }
  if (result.reason === "sign_in_required") {
    return new NextResponse(null, {
      status: 307,
      headers: {
        Location: signInPath(`/posts/${encodeURIComponent(publicId)}`),
        "Cache-Control": "no-store",
      },
    });
  }
  return new NextResponse("Not Found", { status: 404 });
}
