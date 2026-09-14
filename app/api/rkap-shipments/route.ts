import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

export async function GET() {
  try {
    const { data, error } = await createClient()
      .from("rkap_shipments")
      .select("*")
      .order("tahun", { ascending: false })
      .order("bulan", { ascending: false })
      .order("packing_plant", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("GET rkap_shipments error:", error);
    return NextResponse.json({ ok: false, message: "Gagal mengambil data RKAP shipment" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await createClient()
      .from("rkap_shipments")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("POST rkap_shipments error:", error);
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Gagal menambah data RKAP shipment";
    const details =
      typeof error === "object" && error && "details" in error
        ? String((error as { details?: unknown }).details)
        : undefined;
    const hint =
      typeof error === "object" && error && "hint" in error
        ? String((error as { hint?: unknown }).hint)
        : undefined;
    return NextResponse.json(
      { ok: false, message, details, hint },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ ok: false, message: "ID wajib diisi" }, { status: 400 });

    const { data, error } = await createClient()
      .from("rkap_shipments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("PUT rkap_shipments error:", error);
    return NextResponse.json({ ok: false, message: "Gagal update data RKAP shipment" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ ok: false, message: "ID wajib diisi" }, { status: 400 });

    const { error } = await createClient()
      .from("rkap_shipments")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE rkap_shipments error:", error);
    return NextResponse.json({ ok: false, message: "Gagal hapus data RKAP shipment" }, { status: 500 });
  }
}
