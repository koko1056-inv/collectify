import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AdminItemForm } from "@/components/AdminItemForm";
import { BatchItemForm } from "@/components/BatchItemForm";
import { BackButton } from "@/components/navigation/BackButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AddItem() {
  const [mode, setMode] = useState<"single" | "batch">("batch");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-1 sm:px-4 py-8">
        <div className="mt-8">
          <BackButton className="mb-6" to="/search" />
        </div>
        
        <div className="max-w-5xl mx-auto">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "batch")} className="w-full">
            <TabsList className="grid w-full max-w-[320px] mx-auto grid-cols-2 bg-white border border-gray-200 rounded-full mb-6">
              <TabsTrigger
                value="batch"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
              >
                複数追加
              </TabsTrigger>
              <TabsTrigger
                value="single"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
              >
                1つずつ追加
              </TabsTrigger>
            </TabsList>

            <TabsContent value="batch">
              <BatchItemForm />
            </TabsContent>

            <TabsContent value="single">
              <div className="max-w-xl mx-auto">
                <AdminItemForm />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
