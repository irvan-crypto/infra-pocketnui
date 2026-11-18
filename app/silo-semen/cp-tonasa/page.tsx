import { redirect } from "next/navigation";

// Halaman pemantauan CP Tonasa pindah ke /monitoring/cp-tonasa
export default function Page() {
  redirect("/monitoring/cp-tonasa");
}
