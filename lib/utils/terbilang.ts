/**
 * Utility function to convert numbers into Indonesian words (Terbilang).
 * Example: 561600000 -> "Lima Ratus Enam Puluh Satu Juta Enam Ratus Ribu Rupiah"
 */

const BILANGAN = [
  "",
  "Satu",
  "Dua",
  "Tiga",
  "Empat",
  "Lima",
  "Enam",
  "Tujuh",
  "Delapan",
  "Sembilan",
  "Sepuluh",
  "Sebelas",
];

export function terbilang(num: number): string {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Nol";

  function sebut(x: number): string {
    if (x < 12) {
      return BILANGAN[x];
    } else if (x < 20) {
      return sebut(x - 10) + " Belas";
    } else if (x < 100) {
      return sebut(Math.floor(x / 10)) + " Puluh " + sebut(x % 10);
    } else if (x < 200) {
      return "Seratus " + sebut(x - 100);
    } else if (x < 1000) {
      return sebut(Math.floor(x / 100)) + " Ratus " + sebut(x % 100);
    } else if (x < 2000) {
      return "Seribu " + sebut(x - 1000);
    } else if (x < 1000000) {
      return sebut(Math.floor(x / 1000)) + " Ribu " + sebut(x % 1000);
    } else if (x < 1000000000) {
      return sebut(Math.floor(x / 1000000)) + " Juta " + sebut(x % 1000000);
    } else if (x < 1000000000000) {
      return sebut(Math.floor(x / 1000000000)) + " Miliar " + sebut(x % 1000000000);
    } else if (x < 1000000000000000) {
      return sebut(Math.floor(x / 1000000000000)) + " Triliun " + sebut(x % 1000000000000);
    }
    return "";
  }

  return sebut(n).replace(/\s+/g, " ").trim();
}

export function getCurrencyWord(code: string): string {
  const c = (code || "IDR").toUpperCase().trim();
  switch (c) {
    case "IDR":
      return "Rupiah";
    case "USD":
      return "US Dollar";
    case "EUR":
      return "Euro";
    case "SGD":
      return "Dollar Singapura";
    case "CNY":
      return "Yuan";
    case "JPY":
      return "Yen";
    case "GBP":
      return "Poundsterling";
    case "MYR":
      return "Ringgit";
    case "AUD":
      return "Dollar Australia";
    default:
      return code;
  }
}

export function terbilangCurrency(
  num: number,
  currencyCode: string = "IDR",
  customCurrencyName?: string
): string {
  const unit = customCurrencyName || getCurrencyWord(currencyCode);
  if (!num || num === 0) return `Nol ${unit}`;
  const kata = terbilang(num);
  return kata ? `${kata} ${unit}` : `Nol ${unit}`;
}

export function terbilangRupiah(num: number): string {
  return terbilangCurrency(num, "IDR");
}
