import { Navbar } from "@/components/Navbar";
import { AdminItemForm } from "@/components/AdminItemForm";
import { BackButton } from "@/components/navigation/BackButton";

export default function AddItem() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <BackButton className="mb-6" />
        <div className="max-w-xl mx-auto">
          <AdminItemForm />
        </div>
      </main>
    </div>
  );
}