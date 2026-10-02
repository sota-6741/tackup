function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `<input type="datetime-local">` の値の形（その端末のタイムゾーンの `YYYY-MM-DDTHH:mm`）にする。 */
export function toDatetimeLocalValue(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `datetime-local` の値を、その端末のタイムゾーンの日時として読み、ISO 8601（UTC）にする。タイムゾーンを知っているのはブラウザだけなので、サーバーへ送る前に変える。読めなければ `null`。 */
export function datetimeLocalToIso(value: string): string | null {
  const date = new Date(value);
  if (value === "" || Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
