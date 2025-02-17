
import { Navbar } from "@/components/Navbar";
import { BackButton } from "@/components/navigation/BackButton";
import { AdminItemForm } from "@/components/AdminItemForm";

export default function AddOfficialItem() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <BackButton className="mb-6" />
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">公式グッズを追加</h1>
          <AdminItemForm isOfficialItem={true} />
        </div>
      </main>
    </div>
  );
}
