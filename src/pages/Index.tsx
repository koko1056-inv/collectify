import { Navbar } from "@/components/Navbar";
import { GoodsCard } from "@/components/GoodsCard";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

const SAMPLE_ITEMS = [
  {
    id: 1,
    title: "ナルト うずまきナルト フィギュア",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
    price: "¥12,800",
  },
  {
    id: 2,
    title: "ワンピース ルフィ アクションフィギュア",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
    price: "¥15,600",
  },
  {
    id: 3,
    title: "鬼滅の刃 我妻善逸 フィギュア",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
    price: "¥14,300",
  },
  {
    id: 4,
    title: "進撃の巨人 エレン・イェーガー フィギュア",
    image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b",
    price: "¥13,200",
  },
  {
    id: 5,
    title: "ドラゴンボール 孫悟空 フィギュア",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
    price: "¥11,800",
  },
  {
    id: 6,
    title: "ハンターハンター キルア フィギュア",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
    price: "¥13,500",
  },
];

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = SAMPLE_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-accent">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Input
              type="text"
              placeholder="グッズを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-8 animate-fade-in">
          人気のアニメグッズ
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <GoodsCard
              key={item.id}
              title={item.title}
              image={item.image}
              price={item.price}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;