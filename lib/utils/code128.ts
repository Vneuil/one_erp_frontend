/**
 * Code 128 (subset B) barcode encoder: printable ASCII 32-126.
 *
 * Each symbol is six alternating bar/space widths (bar first) summing to 11
 * modules; the stop symbol has seven and sums to 13. Index = symbol value.
 */
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232",
];
const STOP = "2331112";
const START_B = 104;

/** True when every character can be encoded (printable ASCII, non-empty). */
export function canEncode128(text: string): boolean {
  return text.length > 0 && [...text].every((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126);
}

/** The symbol values for `text`: start, data, checksum. Stop is added when drawing. */
export function code128Values(text: string): number[] {
  if (!canEncode128(text)) throw new Error("Code 128 subset B encodes printable ASCII only");
  const data = [...text].map((c) => c.charCodeAt(0) - 32);
  const sum = data.reduce((acc, v, i) => acc + v * (i + 1), START_B);
  return [START_B, ...data, sum % 103];
}

/** Module widths as alternating bar/space runs, starting with a bar (quiet zones not included). */
export function code128Runs(text: string): number[] {
  const runs: number[] = [];
  for (const v of code128Values(text)) runs.push(...[...PATTERNS[v]].map(Number));
  runs.push(...[...STOP].map(Number));
  return runs;
}

/** Total width in modules, including 10-module quiet zones on each side. */
export function code128Width(text: string): number {
  return code128Runs(text).reduce((a, b) => a + b, 0) + 20;
}
