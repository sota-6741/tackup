import QRCode from "qrcode";

/** 余白（4 マス）は、読み取りに必要な幅。印刷して切り抜いても残るよう、画像に含める。 */
export function generateQrCodeSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
  });
}
