/**
 * One-shot patcher: writes the `pricing.fxDisclaimer` string into each
 * lib/page-strings/<locale>.json that doesn't already have it. EN + FR
 * + ES were added by hand during the currency-module work; this script
 * fills in the remaining 13 locales so a JP/AR/HI visitor with a
 * non-USD currency doesn't see an English disclaimer.
 *
 * Run: pnpm tsx scripts/patch-fx-disclaimer.ts
 */
import fs from "node:fs"
import path from "node:path"

const TRANSLATIONS: Record<string, string> = {
  de: "Ungefährer lokaler Preis. Der genaue Betrag in der Währung deiner Karte wird beim Checkout angezeigt.",
  pt: "Preço local aproximado. O valor exato na moeda do teu cartão é mostrado no checkout.",
  it: "Prezzo locale approssimativo. L'importo esatto nella valuta della tua carta è mostrato al checkout.",
  nl: "Geschatte lokale prijs. Het exacte bedrag in de valuta van je kaart wordt bij de checkout getoond.",
  sv: "Ungefärligt lokalt pris. Det exakta beloppet i ditt korts valuta visas vid checkout.",
  pl: "Przybliżona cena lokalna. Dokładna kwota w walucie Twojej karty zostanie pokazana przy płatności.",
  tr: "Yaklaşık yerel fiyat. Kartınızın para birimindeki tam tutar ödeme sırasında gösterilir.",
  ja: "おおよその現地価格です。お使いのカードの通貨での正確な金額はチェックアウト時に表示されます。",
  ko: "대략적인 현지 가격입니다. 사용 카드 통화의 정확한 금액은 체크아웃 시 표시됩니다.",
  zh: "本地价格为近似值。您卡片货币的精确金额将在结账时显示。",
  ru: "Приблизительная цена в местной валюте. Точная сумма в валюте вашей карты отображается на оформлении.",
  ar: "السعر المحلي تقريبي. سيتم عرض المبلغ الدقيق بعملة بطاقتك عند الدفع.",
  hi: "अनुमानित स्थानीय मूल्य। आपके कार्ड की मुद्रा में सटीक राशि चेकआउट पर दिखाई जाएगी।"
}

function main() {
  const dir = path.join(__dirname, "..", "lib", "page-strings")
  let touched = 0
  for (const [code, line] of Object.entries(TRANSLATIONS)) {
    const file = path.join(dir, `${code}.json`)
    if (!fs.existsSync(file)) {
      console.error(`✗ ${code}.json missing — skipping`)
      continue
    }
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, Record<string, unknown>>
    if (!data.pricing) data.pricing = {}
    data.pricing.fxDisclaimer = line
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8")
    console.log(`✓ ${code}.json — fxDisclaimer added`)
    touched++
  }
  console.log(`\nTouched ${touched} locale files.`)
}

main()
