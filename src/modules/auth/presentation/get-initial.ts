/** 名前が空（空白だけを含む）ならメールアドレスから取る。絵文字などが壊れないよう、文字単位で最初の1文字を取り出す。 */
export function getInitial(name: string, email: string): string {
  const source = name.trim() || email;
  const [first] = [...source];
  return first?.toUpperCase() ?? "";
}
