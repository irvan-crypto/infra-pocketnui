import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import {
  MONITORING_CONFIGS,
  type MonitoringTableConfig,
} from "@/lib/monitoring-config";

// ============================================================
// API generik untuk semua tabel monitoring harian.
// URL: /api/monitoring/<nama_tabel>
// Nama tabel divalidasi terhadap whitelist di monitoring-config.
// ============================================================

type Ctx = { params: Promise<{ table: string }> };

function resolveConfig(table: string): MonitoringTableConfig | null {
  return MONITORING_CONFIGS.find((c) => c.table === table) ?? null;
}

/** Ambil hanya kolom yang boleh diisi (buang id, generated, timestamp) */
function sanitizePayload(
  cfg: MonitoringTableConfig,
  body: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.tanggal === "string" && body.tanggal) {
    out.tanggal = body.tanggal.slice(0, 10);
  }
  for (const f of cfg.fields) {
    if (f.generated) continue; // generated column dihitung database
    const v = body[f.key];
    if (v === undefined) continue;
    if (f.type === "number") {
      out[f.key] = Number(v) || 0;
    } else {
      out[f.key] = String(v ?? "").trim();
    }
  }
  return out;
}

export async function GET(_request: Request, ctx: Ctx) {
  const { table } = await ctx.params;
  const cfg = resolveConfig(table);
  if (!cfg) {
    return NextResponse.json({ ok: false, message: "Tabel tidak dikenal" }, { status: 400 });
  }

  try {
    const { data, error } = await createClient()
      .from(cfg.table)
      .select("*")
      .order("tanggal", { ascending: false })
      .order("create_date", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error(`GET ${cfg.table} error:`, error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, ctx: Ctx) {
  const { table } = await ctx.params;
  const cfg = resolveConfig(table);
  if (!cfg) {
    return NextResponse.json({ ok: false, message: "Tabel tidak dikenal" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const payload = sanitizePayload(cfg, body);

    if (!payload.tanggal) {
      return NextResponse.json({ ok: false, message: "Tanggal wajib diisi" }, { status: 400 });
    }

    // Guard duplikat:
    // - uniquePerDate: 1 baris per tanggal
    // - uniqueBy: kombinasi tanggal + field (mis. expeditur)
    if (cfg.uniquePerDate || cfg.uniqueBy) {
      let dupQuery = createClient()
        .from(cfg.table)
        .select("id")
        .eq("tanggal", payload.tanggal);
      if (!cfg.uniquePerDate && cfg.uniqueBy) {
        dupQuery = dupQuery.eq(cfg.uniqueBy, String(payload[cfg.uniqueBy] ?? "").trim());
      }
      const { data: existing } = await dupQuery.limit(1);
      if (existing && existing.length > 0) {
        const label = cfg.uniquePerDate
          ? `Data tanggal ${payload.tanggal}`
          : `Data tanggal ${payload.tanggal} untuk "${payload[cfg.uniqueBy!]}"`;
        return NextResponse.json(
          { ok: false, message: `${label} sudah ada. Gunakan Edit untuk mengubah.` },
          { status: 409 }
        );
      }
    }

    const { data, error } = await createClient()
      .from(cfg.table)
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error(`POST ${cfg.table} error:`, error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal menambah data",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  const { table } = await ctx.params;
  const cfg = resolveConfig(table);
  if (!cfg) {
    return NextResponse.json({ ok: false, message: "Tabel tidak dikenal" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ ok: false, message: "ID wajib diisi" }, { status: 400 });
    }

    const updates = sanitizePayload(cfg, rest);

    // Guard duplikat saat edit: kombinasi unik tidak boleh menabrak baris lain
    if (updates.tanggal && (cfg.uniquePerDate || cfg.uniqueBy)) {
      let dupQuery = createClient()
        .from(cfg.table)
        .select("id")
        .eq("tanggal", updates.tanggal)
        .neq("id", id);
      if (!cfg.uniquePerDate && cfg.uniqueBy) {
        dupQuery = dupQuery.eq(cfg.uniqueBy, String(updates[cfg.uniqueBy] ?? "").trim());
      }
      const { data: existing } = await dupQuery.limit(1);
      if (existing && existing.length > 0) {
        const label = cfg.uniquePerDate
          ? `Data tanggal ${updates.tanggal}`
          : `Data tanggal ${updates.tanggal} untuk "${updates[cfg.uniqueBy!]}"`;
        return NextResponse.json(
          { ok: false, message: `${label} sudah digunakan baris lain.` },
          { status: 409 }
        );
      }
    }

    const { data, error } = await createClient()
      .from(cfg.table)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error(`PUT ${cfg.table} error:`, error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal update data",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { table } = await ctx.params;
  const cfg = resolveConfig(table);
  if (!cfg) {
    return NextResponse.json({ ok: false, message: "Tabel tidak dikenal" }, { status: 400 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ ok: false, message: "ID wajib diisi" }, { status: 400 });
    }

    const { error } = await createClient().from(cfg.table).delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`DELETE ${cfg.table} error:`, error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal hapus data",
      },
      { status: 500 }
    );
  }
}
