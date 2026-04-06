// src/data/sheets.ts
// Fetches products from Google Sheets CSV on every request

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQM4ZmnmjiGRPEXY5yXpzmmMPUzBhFwR9Cdjl7wSrcDDMCmcNtYqvOeMlc8HSln137D7XmTldSnbrsW/pub?gid=0&single=true&output=csv";

export interface Product {
  id: number;
  name: string;
  category: string;
  subcategory: string;
  estado: string;
  price: number | null;
  currency: string;
  image: string;
  specs: string;
  tags: string[];
}

export interface CategoryConfig {
  id: string;
  name: string;
  tagline: string;
  color: string;
  textColor: string;
  emoji: string;
  image?: string;
  subcategories: string[];
}

// ── CATEGORY CONFIG ──────────────────────────────────────────────────────────
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  "SmartPhones": {
    id: "smartphones", color: "#ede8f5", textColor: "#2d1f5e",
    name: "SmartPhones", tagline: "Los mejores dispositivos, al mejor precio.",
    emoji: "📱", image: "/images/categories/iphone17pro.png",
    subcategories: ["Nuevos", "iPhone Bateria Original", "iPhone Usados Premium", "Otras Marcas Nuevo"],
  },
  "Gaming": {
    id: "gaming", color: "#fde8d8", textColor: "#7a2e0e",
    name: "Gaming", tagline: "Juega sin límites.",
    emoji: "🎮", image: "/images/categories/gaming.png",
    subcategories: [],
  },
  "Accesorios celulares": {
    id: "accesorios-cel", color: "#d8f0e8", textColor: "#0e5c38",
    name: "Accesorios celulares", tagline: "Todo lo que tu celular necesita.",
    emoji: "🔌", image: "/images/categories/accesorios-cel.png",
    subcategories: [],
  },
  "Accesorios Techh": {
    id: "accesorios-techh", color: "#fef3c7", textColor: "#78350f",
    name: "Accesorios Techh", tagline: "Gadgets y tecnología para tu día a día.",
    emoji: "⌚", image: "/images/categories/accesorios-techh.png",
    subcategories: [],
  },
  "TV y Electronica": {
    id: "tv-electronica", color: "#dbeafe", textColor: "#1e3a8a",
    name: "TV y Electronica", tagline: "Entretenimiento y conectividad.",
    emoji: "📺", image: "/images/categories/tv.png",
    subcategories: [],
  },
  "Audio": {
    id: "audio", color: "#fce7f3", textColor: "#831843",
    name: "Audio", tagline: "El sonido que mereces.",
    emoji: "🔊", image: "/images/categories/audio.png",
    subcategories: [],
  },
  "Hogar": {
    id: "hogar", color: "#dcfce7", textColor: "#14532d",
    name: "Hogar", tagline: "Tecnología para tu hogar.",
    emoji: "🏠", image: "/images/categories/hogar.png",
    subcategories: ["Pequeños Electrodomesticos", "Accesorios de Cocina"],
  },
  "Cuidado Personal y Belleza": {
    id: "belleza", color: "#fdf2f8", textColor: "#701a75",
    name: "Cuidado Personal y Belleza", tagline: "Tu mejor versión.",
    emoji: "💄", image: "/images/categories/belleza.png",
    subcategories: ["Salud y Bienestar"],
  },
  "Otros": {
    id: "otros", color: "#e2e8f0", textColor: "#1e293b",
    name: "Otros", tagline: "Herramientas y más.",
    emoji: "🔧", image: "/images/categories/otros.png",
    subcategories: [],
  },
};

export const SUBCAT_IMAGES: Record<string, string> = {
  "Nuevos": "/images/subcategories/nuevos.jpg",
  "iPhone Bateria Original": "/images/subcategories/bateria-original.jpg",
  "iPhone Usados Premium": "/images/subcategories/usados-premium.jpg",
  "Otras Marcas Nuevo": "/images/subcategories/otras-marcas.jpg",
  "Pequeños Electrodomesticos": "/images/subcategories/pequenos-electrodomesticos.jpg",
  "Accesorios de Cocina": "/images/subcategories/accesorios-cocina.jpg",
  "Salud y Bienestar": "/images/subcategories/salud-bienestar.jpg",
};

// ── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h.trim()] = values[i] ?? ""; });
    return obj;
  });
}

// ── SLUG HELPER ──────────────────────────────────────────────────────────────
export function toSlug(str: string): string {
  return str.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i").replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u").replace(/[ñ]/g, "n")
    .replace(/[^a-z0-9-]/g, "");
}

// ── FORMAT PRICE ─────────────────────────────────────────────────────────────
export function formatPrice(price: number | null, currency: string): string {
  if (price === null || price === 0) return "Consultar precio";
  if (currency === "USD") return `USD ${price.toLocaleString("es-AR")}`;
  return `$ ${price.toLocaleString("es-AR")}`;
}

// ── MAIN FETCH FUNCTION ──────────────────────────────────────────────────────
export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const rows = parseCSV(text);

    return rows
      .filter(r => r["Título del Producto"]?.trim())
      .map((r, i) => ({
        id: parseInt(r["id"]) || i + 1,
        name: r["Título del Producto"]?.trim() ?? "",
        category: r["Categoría"]?.trim() ?? "",
        subcategory: r["Subcategoría"]?.trim() ?? "",
        estado: r["Estado"]?.trim() ?? "",
        price: r["Precio"] ? parseFloat(r["Precio"].replace(/[^0-9.]/g, "")) || null : null,
        currency: r["Moneda"]?.trim() ?? "ARS",
        image: r["Imagen"]?.trim() ?? "",
        specs: r["Specs"]?.trim() ?? "",
        tags: r["Etiquetas (Tags)"]?.trim()
          ? r["Etiquetas (Tags)"].split(",").map(t => t.trim()).filter(Boolean)
          : [],
      }));
  } catch (e) {
    console.error("Error fetching products from Google Sheets:", e);
    return [];
  }
}

// ── DERIVED HELPERS ──────────────────────────────────────────────────────────
export function getCategories(): CategoryConfig[] {
  return Object.values(CATEGORY_CONFIG);
}

export function getCatBySlug(slug: string): CategoryConfig | undefined {
  return Object.values(CATEGORY_CONFIG).find(c => c.id === slug);
}

export function getCatByName(name: string): CategoryConfig | undefined {
  return CATEGORY_CONFIG[name];
}
