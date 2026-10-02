import { getPostQrCode } from "@/di/post";
import { getSession } from "@/modules/auth/presentation/session";

/** 掲示物詳細の URL の QR コード（SVG）。メンバーにだけ返す。 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/posts/[publicId]/qr">,
) {
  const { publicId } = await params;
  const session = await getSession();
  const result = await getPostQrCode({
    publicId,
    userId: session?.user.id ?? null,
  });
  if (!result.ok) return new Response("Not Found", { status: 404 });

  return new Response(result.svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
