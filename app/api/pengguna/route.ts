import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pengguna")
      .select("*", { count: "exact" })
      .order("nama");

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("GET pengguna error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil data pengguna" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, sap, jabatan, unit_kerja, username, password, role, unit_pp } = body;

    if (!nama || !sap || !username || !password || !role) {
      return NextResponse.json(
        { ok: false, message: "Field wajib harus diisi" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("pengguna")
      .insert({
        nama,
        sap,
        jabatan: jabatan || null,
        unit_kerja: unit_kerja || null,
        username,
        password: hashedPassword,
        role,
        unit_pp: unit_pp || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("POST pengguna error:", error);
    
    if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
      return NextResponse.json(
        { ok: false, message: "Username atau SAP sudah ada" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { ok: false, message: "Gagal menambah pengguna" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, nama, sap, jabatan, unit_kerja, username, password, role, unit_pp } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "ID wajib diisi" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Update user, encrypt password jika diubah
    const updateData: any = {};
    if (nama) updateData.nama = nama;
    if (sap) updateData.sap = sap;
    if (jabatan) updateData.jabatan = jabatan;
    if (unit_kerja) updateData.unit_kerja = unit_kerja;
    if (username) updateData.username = username;
    if (role) updateData.role = role;
    if (unit_pp) updateData.unit_pp = unit_pp;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from("pengguna")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("PUT pengguna error:", error);
    
    if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
      return NextResponse.json(
        { ok: false, message: "Username atau SAP sudah ada" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { ok: false, message: "Gagal update pengguna" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "ID wajib diisi" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("pengguna")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE pengguna error:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal hapus pengguna" },
      { status: 500 }
    );
  }
}