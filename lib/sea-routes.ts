/**
 * Jalur pelayaran (sea routes) dari pelabuhan asal ke packing plant.
 *
 * Waypoint disusun mengikuti alur pelayaran Indonesia — Selat Makassar,
 * Laut Jawa, Laut Flores, Laut Banda, Laut Maluku, Selat Bali/Lombok —
 * supaya garis pada peta tidak menembus daratan.
 *
 * Koordinat: [lat, lng]
 */

export type Coord = [number, number];

// ── Titik pelabuhan asal ────────────────────────────────────────────────────
const BIRINGKASSI: Coord = [-4.8175, 119.4833];
const TUBAN: Coord = [-6.7816, 111.8964];

// ── Waypoint perairan Indonesia ─────────────────────────────────────────────
// Selat Makassar (koridor utara–selatan)
const MS_S: Coord = [-5.3, 118.8];
const MS_1: Coord = [-4.0, 118.6];
const MS_2: Coord = [-2.5, 118.5];
const MS_3: Coord = [-1.0, 118.5];
const MS_N: Coord = [0.5, 119.2];

// Perairan barat & selatan Sulawesi
const PALU_APPROACH: Coord = [-0.5, 119.5];
const TANJUNG_BIRA: Coord = [-5.7, 120.5];
const SULAWESI_S: Coord = [-5.7, 121.8];
const KENDARI_APPROACH: Coord = [-4.5, 122.7];

// Laut Jawa
const JS_MID: Coord = [-4.5, 112.5];
const JS_E: Coord = [-5.0, 114.5];

// Kalimantan selatan & timur
const BANJARMASIN_SEA: Coord = [-3.8, 114.5];
const BALIKPAPAN_SEA: Coord = [-1.2, 117.2];
const SAMARINDA_SEA: Coord = [0.3, 117.3];

// Laut Sulawesi & Sulawesi Utara
const SULAWESI_SEA: Coord = [1.5, 122.5];
const BITUNG_SEA: Coord = [1.5, 125.0];

// Laut Maluku
const MOLUCCA_SEA: Coord = [0.0, 125.5];

// Selat Bali & Lombok
const E_JAVA: Coord = [-7.3, 113.5];
const BALI_STRAIT: Coord = [-8.3, 114.6];
const LOMBOK_STRAIT: Coord = [-8.5, 116.0];

// Laut Flores
const FLORES_1: Coord = [-7.5, 119.0];
const FLORES_2: Coord = [-6.5, 122.0];

// Laut Banda
const BANDA_1: Coord = [-5.0, 124.0];
const BANDA_2: Coord = [-4.0, 127.0];
const AMBON_APPROACH: Coord = [-3.6, 128.1];

// Laut Seram
const SERAM: Coord = [-2.5, 130.0];

// ── Tabel rute ──────────────────────────────────────────────────────────────
// Key: "<nama pelabuhan asal>|<nama packing plant>"

const SEA_ROUTES: Record<string, Coord[]> = {
  // ═══ Dari Pelabuhan Biringkassi ═══

  "Pelabuhan Biringkassi|PP. Palu": [
    BIRINGKASSI, MS_S, MS_1, MS_2, MS_3, PALU_APPROACH, [-0.6901, 119.829],
  ],

  "Pelabuhan Biringkassi|PP. Mamuju": [
    BIRINGKASSI, MS_S, MS_1, MS_2, [-2.4824, 119.1238],
  ],

  "Pelabuhan Biringkassi|PP. Kendari": [
    BIRINGKASSI, MS_S, TANJUNG_BIRA, SULAWESI_S, KENDARI_APPROACH, [-4.1592, 122.7006],
  ],

  "Pelabuhan Biringkassi|PP. Balikpapan": [
    BIRINGKASSI, MS_S, MS_1, MS_2, BALIKPAPAN_SEA, [-1.1558, 116.7822],
  ],

  "Pelabuhan Biringkassi|PP. Samarinda": [
    BIRINGKASSI, MS_S, MS_1, MS_2, BALIKPAPAN_SEA, SAMARINDA_SEA, [-0.5584, 117.1748],
  ],

  "Pelabuhan Biringkassi|PP. Banjarmasin": [
    BIRINGKASSI, MS_S, [-4.5, 116.5], BANJARMASIN_SEA, [-3.3019, 114.5681],
  ],

  "Pelabuhan Biringkassi|PP. Bitung": [
    BIRINGKASSI, MS_S, MS_1, MS_2, MS_3, MS_N, SULAWESI_SEA, BITUNG_SEA, [1.4428, 125.1962],
  ],

  "Pelabuhan Biringkassi|PP. Lembar": [
    BIRINGKASSI, MS_S, [-6.0, 117.5], [-7.0, 116.5], LOMBOK_STRAIT, [-8.6708, 116.072],
  ],

  "Pelabuhan Biringkassi|PP. Ambon": [
    BIRINGKASSI, MS_S, TANJUNG_BIRA, FLORES_2, BANDA_1, BANDA_2, AMBON_APPROACH, [-3.7014, 128.1634],
  ],

  "Pelabuhan Biringkassi|PP. Oba": [
    BIRINGKASSI, MS_S, MS_1, MS_2, MS_3, MS_N, SULAWESI_SEA, BITUNG_SEA, MOLUCCA_SEA, [0.7122, 127.5488],
  ],

  "Pelabuhan Biringkassi|PP. Sorong": [
    BIRINGKASSI, MS_S, TANJUNG_BIRA, FLORES_2, BANDA_1, BANDA_2, SERAM, [-1.0301, 131.2416],
  ],

  // ═══ Dari Pelabuhan Tuban ═══

  "Pelabuhan Tuban|PP. Palu": [
    TUBAN, JS_MID, JS_E, [-4.5, 116.5], [-3.5, 117.5], MS_2, MS_3, PALU_APPROACH, [-0.6901, 119.829],
  ],

  "Pelabuhan Tuban|PP. Mamuju": [
    TUBAN, JS_MID, JS_E, [-4.5, 116.5], [-3.5, 117.5], MS_2, [-2.4824, 119.1238],
  ],

  "Pelabuhan Tuban|PP. Kendari": [
    TUBAN, E_JAVA, BALI_STRAIT, LOMBOK_STRAIT, FLORES_1, FLORES_2, KENDARI_APPROACH, [-4.1592, 122.7006],
  ],

  "Pelabuhan Tuban|PP. Balikpapan": [
    TUBAN, JS_MID, JS_E, [-4.5, 116.5], [-3.5, 117.5], MS_2, BALIKPAPAN_SEA, [-1.1558, 116.7822],
  ],

  "Pelabuhan Tuban|PP. Samarinda": [
    TUBAN, JS_MID, JS_E, [-4.5, 116.5], [-3.5, 117.5], MS_2, BALIKPAPAN_SEA, SAMARINDA_SEA, [-0.5584, 117.1748],
  ],

  "Pelabuhan Tuban|PP. Banjarmasin": [
    TUBAN, JS_MID, [-4.8, 113.5], BANJARMASIN_SEA, [-3.3019, 114.5681],
  ],

  "Pelabuhan Tuban|PP. Bitung": [
    TUBAN, JS_MID, JS_E, [-4.5, 116.5], [-3.5, 117.5], MS_2, MS_3, MS_N, SULAWESI_SEA, BITUNG_SEA, [1.4428, 125.1962],
  ],

  "Pelabuhan Tuban|PP. Lembar": [
    TUBAN, E_JAVA, BALI_STRAIT, LOMBOK_STRAIT, [-8.6708, 116.072],
  ],

  "Pelabuhan Tuban|PP. Ambon": [
    TUBAN, E_JAVA, BALI_STRAIT, LOMBOK_STRAIT, FLORES_1, FLORES_2, BANDA_1, BANDA_2, AMBON_APPROACH, [-3.7014, 128.1634],
  ],

  "Pelabuhan Tuban|PP. Oba": [
    TUBAN, JS_MID, JS_E, [-4.5, 116.5], [-3.5, 117.5], MS_2, MS_3, MS_N, SULAWESI_SEA, BITUNG_SEA, MOLUCCA_SEA, [0.7122, 127.5488],
  ],

  "Pelabuhan Tuban|PP. Sorong": [
    TUBAN, E_JAVA, BALI_STRAIT, LOMBOK_STRAIT, FLORES_1, FLORES_2, BANDA_1, BANDA_2, SERAM, [-1.0301, 131.2416],
  ],
};

/**
 * Ambil jalur laut untuk pasangan pelabuhan asal → packing plant.
 * Return `null` bila rute tidak terdaftar (pemanggil pakai garis lurus).
 */
export function getSeaRoute(
  pelabuhanAsal: string,
  tujuanPP: string,
): Coord[] | null {
  return SEA_ROUTES[`${pelabuhanAsal}|${tujuanPP}`] ?? null;
}

// ── Estimasi durasi & posisi kapal di jalur laut ────────────────────────────

/** Kecepatan rata-rata kapal kargo semen (km/jam) — sekitar 12 knot. */
export const SHIP_SPEED_KMH = 22;

/** Jarak great-circle antara 2 titik [lat, lng] dalam kilometer. */
export function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Panjang total jalur laut (km) dengan menjumlahkan setiap segmen. */
export function routeDistanceKm(route: Coord[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += haversineKm(route[i], route[i + 1]);
  }
  return total;
}

/** Estimasi durasi perjalanan (jam) untuk menempuh seluruh jalur. */
export function estimateRouteHours(route: Coord[]): number {
  return routeDistanceKm(route) / SHIP_SPEED_KMH;
}

/**
 * Titik pada jalur sesuai progress 0..1.
 * progress 0 = pelabuhan asal, 1 = packing plant tujuan.
 */
export function pointAlongRoute(route: Coord[], progress: number): Coord {
  if (route.length === 0) return [0, 0];
  if (route.length === 1) return route[0];

  const p = Math.min(Math.max(progress, 0), 1);

  const segLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const d = haversineKm(route[i], route[i + 1]);
    segLengths.push(d);
    total += d;
  }
  if (total === 0) return route[0];

  const target = total * p;
  let acc = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const seg = segLengths[i];
    if (acc + seg >= target) {
      const t = seg === 0 ? 0 : (target - acc) / seg;
      const [lat1, lng1] = route[i];
      const [lat2, lng2] = route[i + 1];
      return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t];
    }
    acc += seg;
  }
  return route[route.length - 1];
}