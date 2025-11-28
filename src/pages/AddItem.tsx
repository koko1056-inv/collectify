
import { Navbar } from "@/components/Navbar";
import { AdminItemForm } from "@/components/AdminItemForm";
import { BackButton } from "@/components/navigation/BackButton";

export default function AddItem() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-0 sm:px-4 py-8">
        <div className="mt-8">
          <BackButton className="mb-6" to="/search" />
        </div>
        <div className="max-w-2xl mx-auto px-2 sm:px-0">
          <AdminItemForm />
        </div>
      </main>
    </div>
  );
}
