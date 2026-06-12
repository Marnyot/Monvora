/**
 * AI Rule-Based Categorization Engine
 * Matches merchant/description ke kategori berdasarkan regex patterns
 *
 * Strategi:
 * - Rules diurutkan dari yang paling spesifik ke general
 * - Pertama cocok yang dipakai (tidak cek semua rules)
 * - Confidence 0.9-0.95 untuk rule-based (tinggi karena pattern sudah terbukti)
 */

export interface CategoryRule {
  pattern: RegExp // match terhadap merchant_name + description (lowercase)
  category: string // nama kategori yang cocok dengan seed data di DB
  confidence: number // confidence rule ini (biasanya 0.9-0.95)
  payment_methods?: string[] // opsional: hanya apply untuk payment method tertentu
}

export interface RuleMatchResult {
  category: string
  confidence: number
  matchedRule: string // deskripsi rule yang cocok (untuk debugging)
}

/**
 * CATEGORIZATION_RULES array
 * Urutan penting — pertama cocok yang dipakai
 *
 * Kategori yang tersedia (sesuai seed data):
 * - "Makanan & Minuman"
 * - "Transportasi"
 * - "Belanja"
 * - "Kesehatan"
 * - "Hiburan"
 * - "Tagihan & Utilitas"
 * - "Pendidikan"
 * - "Keuangan"
 * - "Lainnya"
 */

export const CATEGORIZATION_RULES: CategoryRule[] = [
  // ===== MAKANAN & MINUMAN (Most Specific First) =====
  // Premium / Restaurant chains
  {
    pattern: /wagyu|yakiniku|steak|fine dining|upscale|grill|bbq/i,
    category: 'Makanan & Minuman',
    confidence: 0.95,
  },
  // Fast Food (international)
  {
    pattern: /mcdonalds|kfc|burger king|popeyes|subway|pizza hut|dominos|wendy|taco/i,
    category: 'Makanan & Minuman',
    confidence: 0.95,
  },
  // Coffee & Tea Chains
  {
    pattern: /starbucks|kopi kenangan|j\.co|dunkin|coffee|cafe|kedai kopi|mixue|chatime/i,
    category: 'Makanan & Minuman',
    confidence: 0.95,
  },
  // Food Delivery Apps
  {
    pattern: /gofood|grab food|shopeefood|foodpanda|lalamove|duitpintar|damsu/i,
    category: 'Makanan & Minuman',
    confidence: 0.93,
  },
  // Local Restaurants & Warungs
  {
    pattern: /warteg|rumah makan|restoran|nasi|soto|bakso|martabak|perkedel|batagor/i,
    category: 'Makanan & Minuman',
    confidence: 0.92,
  },
  // Convenience Stores (food section)
  {
    pattern: /indomaret|alfamart|lawson|familymart|7\-?eleven|minimart|bahan makanan/i,
    category: 'Makanan & Minuman',
    confidence: 0.85, // lower confidence sebab jual berbagai kategori
  },
  // Beverage & Juice Bars
  {
    pattern: /juice|smoothie|boba|jus|minuman|teh|air minum|bakso|es cendol/i,
    category: 'Makanan & Minuman',
    confidence: 0.88,
  },

  // ===== TRANSPORTASI =====
  // Ride Hailing (Gojek)
  {
    pattern: /gojek|goride|gocab|gocar|goshop|gosend|gobox/i,
    category: 'Transportasi',
    confidence: 0.95,
  },
  // Ride Hailing (Grab & competitors)
  {
    pattern: /grab|maxim|indrive|uber|bluebird|balap|argo|taxi|taksi/i,
    category: 'Transportasi',
    confidence: 0.95,
  },
  // Public Transportation
  {
    pattern: /krl|mrt|lrt|transjakarta|busway|kai|kereta|angkot|bis|travel|perjalanan/i,
    category: 'Transportasi',
    confidence: 0.94,
  },
  // Gas / Fuel
  {
    pattern: /pertamina|shell|bp|vivo|bensin|bbm|bahan bakar|solar/i,
    category: 'Transportasi',
    confidence: 0.95,
  },
  // Parking & Toll
  {
    pattern: /parkir|tol|garasi|e-?tol|jasa marga|parkingarea/i,
    category: 'Transportasi',
    confidence: 0.94,
  },
  // Vehicle Service & Maintenance
  {
    pattern: /bengkel|service|cuci mobil|oli|sparepart|kendaraan|maintenance|repair/i,
    category: 'Transportasi',
    confidence: 0.93,
  },

  // ===== BELANJA (E-COMMERCE & RETAIL) =====
  // Major E-commerce
  {
    pattern: /tokopedia|shopee|lazada|blibli|bukalapak|qoo10|tiktok shop|amazon/i,
    category: 'Belanja',
    confidence: 0.95,
  },
  // Fashion & Apparel
  {
    pattern: /zara|h\&m|uniqlo|mango|gap|forever 21|cotton on|nike|adidas|puma|reebok|skechers/i,
    category: 'Belanja',
    confidence: 0.94,
  },
  // Electronics & Gadgets
  {
    pattern: /electronic|gadget|hp|smartphone|laptop|iphone|samsung|xiaomi|oppo|vivo|realme/i,
    category: 'Belanja',
    confidence: 0.93,
  },
  // Department Stores
  {
    pattern: /mall|plaza|erafone|futuristik|courts|ikea|ace hardware|informa|world/i,
    category: 'Belanja',
    confidence: 0.92,
  },
  // Cosmetics & Beauty
  {
    pattern: /kosmetik|makeup|skincare|beauty|parfume|salon|barbershop|spa|potong rambut/i,
    category: 'Belanja',
    confidence: 0.93,
  },
  // Books & Stationery
  {
    pattern: /buku|gramedia|alat tulis|stationery|alat kantor/i,
    category: 'Belanja',
    confidence: 0.92,
  },

  // ===== KESEHATAN =====
  // Pharmacies
  {
    pattern: /apotek|kimia farma|guardian|century|putra mart|farmasi|obat|resep/i,
    category: 'Kesehatan',
    confidence: 0.95,
  },
  // Hospitals & Clinics
  {
    pattern: /rumah sakit|klinik|rs|hospital|dokter|kesehatan|medis|dr\.|praktik|pemeriksaan/i,
    category: 'Kesehatan',
    confidence: 0.94,
  },
  // Insurance & BPJS
  {
    pattern: /bpjs|asuransi|premi|kesehatan nasional|kemenkes|jaminan kesehatan/i,
    category: 'Kesehatan',
    confidence: 0.94,
  },
  // Mental Health & Wellness
  {
    pattern: /psikolog|terapi|konseling|wellness|gym|fitness|yoga/i,
    category: 'Kesehatan',
    confidence: 0.92,
  },

  // ===== HIBURAN =====
  // Streaming Services (Music & Video)
  {
    pattern: /netflix|spotify|youtube|prime video|disney\+|hulu|hotstar|viu|iflix|catchplay/i,
    category: 'Hiburan',
    confidence: 0.95,
  },
  // Gaming
  {
    pattern: /steam|playstation|xbox|game|mobile legends|valorant|dota|fortnite|pubg|genshin/i,
    category: 'Hiburan',
    confidence: 0.94,
  },
  // Cinema
  {
    pattern: /bioskop|cgv|xxi|cinepolis|cinemaxx|film|tiket film/i,
    category: 'Hiburan',
    confidence: 0.95,
  },
  // Events & Concerts
  {
    pattern: /tiket|konser|event|pertunjukan|teater|musik|festival|hiburan/i,
    category: 'Hiburan',
    confidence: 0.90,
  },

  // ===== TAGIHAN & UTILITAS =====
  // Electricity
  {
    pattern: /pln|listrik|token listrik|pulsa listrik|tagihan listrik/i,
    category: 'Tagihan & Utilitas',
    confidence: 0.95,
  },
  // Water
  {
    pattern: /pdam|air|tagihan air|aqua|air minum isi ulang/i,
    category: 'Tagihan & Utilitas',
    confidence: 0.94,
  },
  // Internet & Phone (Telco)
  {
    pattern: /telkomsel|xl|indosat|im3|tri|smartfren|three|viettel|telkom|indihome|internet/i,
    category: 'Tagihan & Utilitas',
    confidence: 0.95,
  },
  // Gas
  {
    pattern: /pgas|pertamax|liquid petroleum|elpiji|gas/i,
    category: 'Tagihan & Utilitas',
    confidence: 0.93,
  },
  // Insurance (General)
  {
    pattern: /asuransi|premi|proteksial|chubb|allianz|zurich|mandiri insurance/i,
    category: 'Tagihan & Utilitas',
    confidence: 0.92,
  },

  // ===== PENDIDIKAN =====
  // Online Learning Platforms
  {
    pattern: /udemy|coursera|ruangguru|zenius|quipper|skillshare|belajar|kursus online/i,
    category: 'Pendidikan',
    confidence: 0.94,
  },
  // Tutoring & Coaching
  {
    pattern: /les|bimbingan|tutor|sekolah|universitas|les privat|guru/i,
    category: 'Pendidikan',
    confidence: 0.90,
  },
  // Educational Materials
  {
    pattern: /buku pelajaran|materi pendidikan|alat sekolah/i,
    category: 'Pendidikan',
    confidence: 0.92,
  },

  // ===== KEUANGAN =====
  // Banking Services
  {
    pattern: /transfer|tarik tunai|biaya admin|biaya bank|bunga|investasi|saham|reksadana/i,
    category: 'Keuangan',
    confidence: 0.92,
  },
  // Money Transfer Services
  {
    pattern: /remittance|money changer|tukar|valuta asing|forex/i,
    category: 'Keuangan',
    confidence: 0.91,
  },
  // E-wallet top up (GoPay, OVO, DANA, ShopeePay, LinkAja)
  {
    pattern: /\bgopay\b|\bovo\b|\bdana\b|shopeepay|linkaja|top up/i,
    category: 'Keuangan',
    confidence: 0.85,
  },

  // ===== ADDITIONAL MAKANAN & MINUMAN RULES =====
  {
    pattern: /bakso|soto|nasi goreng|mie|kari|lumpia|gorengan/i,
    category: 'Makanan & Minuman',
    confidence: 0.91,
  },
  {
    pattern: /pizza|burger|hot dog|sandwich|wrap|kebab/i,
    category: 'Makanan & Minuman',
    confidence: 0.92,
  },
  {
    pattern: /bakery|donut|kue|roti|pastry|cookies/i,
    category: 'Makanan & Minuman',
    confidence: 0.90,
  },
  {
    pattern: /bubble tea|boba|matcha|latte|cappuccino|espresso/i,
    category: 'Makanan & Minuman',
    confidence: 0.91,
  },
  // Coffee shop & drinking places — standalone keywords untuk catch merchant yg tidak terkenal
  {
    pattern: /\bkopi\b|teh tarik|es teh|es jeruk|air mineral/i,
    category: 'Makanan & Minuman',
    confidence: 0.85,
  },

  // ===== ADDITIONAL BELANJA RULES =====
  {
    pattern: /toko online|marketplace|retail|toko|store|online shop/i,
    category: 'Belanja',
    confidence: 0.85,
  },
  {
    pattern: /informa|ace hardware|courts|futuristik|erafone/i,
    category: 'Belanja',
    confidence: 0.92,
  },
  {
    pattern: /furniture|perabotan|rumah tangga|dekorasi/i,
    category: 'Belanja',
    confidence: 0.89,
  },
  {
    pattern: /sepatu|fashion|pakaian|baju|celana|jaket/i,
    category: 'Belanja',
    confidence: 0.90,
  },
  // QRIS generic — catch-all ketika QRIS tapi merchant tidak dikenal rules lain
  {
    pattern: /\bqris\b/i,
    category: 'Belanja',
    confidence: 0.70,
  },

  // ===== ADDITIONAL KESEHATAN RULES =====
  {
    pattern: /obat|resep|farmasi|vitamin|suplemen|herbal/i,
    category: 'Kesehatan',
    confidence: 0.91,
  },
  {
    pattern: /dokter gigi|dental|bedah|operasi|periksa kesehatan/i,
    category: 'Kesehatan',
    confidence: 0.93,
  },
  {
    pattern: /fitness|gym|olahraga|yoga|pilates|trainer/i,
    category: 'Kesehatan',
    confidence: 0.90,
  },

  // ===== ADDITIONAL TRANSPORTASI RULES =====
  {
    pattern: /otomotif|mobil|motor|motor cycle|scooter|kendaraan/i,
    category: 'Transportasi',
    confidence: 0.90,
  },
  {
    pattern: /rental|sewa|lease|booking kendaraan/i,
    category: 'Transportasi',
    confidence: 0.89,
  },
  {
    pattern: /pesawat|tiket pesawat|airline|maskapai|runway/i,
    category: 'Transportasi',
    confidence: 0.93,
  },

  // ===== ADDITIONAL HIBURAN RULES =====
  {
    pattern: /twitch|discord nitro|playstation plus|xbox gamepass/i,
    category: 'Hiburan',
    confidence: 0.93,
  },
  {
    pattern: /buku digital|ebook|audiobook|podcast|audible/i,
    category: 'Hiburan',
    confidence: 0.91,
  },
  {
    pattern: /tiket|event|festival|konser|teater|pertunjukan/i,
    category: 'Hiburan',
    confidence: 0.89,
  },

  // ===== ADDITIONAL TAGIHAN RULES =====
  {
    pattern: /xl|indosat|tri|smartfren|viettel|telekomunikasi/i,
    category: 'Tagihan & Utilitas',
    confidence: 0.94,
  },
  {
    pattern: /langganan|subscription|paket data|kuota internet/i,
    category: 'Tagihan & Utilitas',
    confidence: 0.88,
  },
  {
    pattern: /sewa kantor|sewa rumah|rental property|properti|apartemen/i,
    category: 'Belanja',
    confidence: 0.87,
  },

  // ===== ADDITIONAL MAKANAN STREET FOOD =====
  {
    pattern: /gorengan|tahu goreng|tahu|tempe|perkedel|onde/i,
    category: 'Makanan & Minuman',
    confidence: 0.89,
  },
  {
    pattern: /dessert|es krim|ice cream|gelato|frozen|soft serve/i,
    category: 'Makanan & Minuman',
    confidence: 0.90,
  },

  // ===== ADDITIONAL PENDIDIKAN RULES =====
  {
    pattern: /skill|training|bootcamp|workshop|seminar|pelatihan/i,
    category: 'Pendidikan',
    confidence: 0.89,
  },
  {
    pattern: /bahasa|english|mandarin|kursus bahasa|language/i,
    category: 'Pendidikan',
    confidence: 0.90,
  },

  // ===== FALLBACK GENERAL PATTERNS =====
  // Payment Gateway (generic fallback) — harus di paling akhir
  {
    pattern: /payment|pembayaran|transaksi|merchant|pay/i,
    category: 'Lainnya',
    confidence: 0.50, // sangat low confidence untuk generic
  },
]

/**
 * Main function: match transaction ke category
 * Implements fail-safe logic: jika tidak cocok, return null
 */
export function matchCategory(
  merchantName: string | null,
  description: string | null,
): RuleMatchResult | null {
  const text = [merchantName, description].filter(Boolean).join(' ').toLowerCase()

  // Early exit jika tidak ada text untuk match
  if (!text || text.trim().length === 0) {
    return null
  }

  // Loop rules, pertama cocok return
  for (const rule of CATEGORIZATION_RULES) {
    if (rule.pattern.test(text)) {
      return {
        category: rule.category,
        confidence: rule.confidence,
        matchedRule: rule.pattern.toString(),
      }
    }
  }

  // Jika tidak ada rules yang cocok, return null
  // API layer akan gunakan fallback atau minta input user
  return null
}

/**
 * Utility: count rules per kategori (untuk debugging)
 */
export function getRuleStats() {
  const stats = new Map<string, number>()
  for (const rule of CATEGORIZATION_RULES) {
    const current = stats.get(rule.category) || 0
    stats.set(rule.category, current + 1)
  }
  return Object.fromEntries(stats)
}
