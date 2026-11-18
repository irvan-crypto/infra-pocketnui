import { redirect } from "next/navigation";

// Halaman pemantauan Silo Mini pindah ke /monitoring/silo-mini
export default function Page() {
  redirect("/monitoring/silo-mini");
}
