import { Construction } from "lucide-react";

export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <Construction className="w-8 h-8 text-[#1a56db]" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-2">
          {description ??
            "Halaman ini belum tersedia. Konten akan ditambahkan pada tahap berikutnya."}
        </p>
      </div>
    </div>
  );
}