import { Navbar } from "@/components/Navbar";
import { GoodsCard } from "@/components/GoodsCard";

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
];

const Index = () => {
  return (
    <div className="min-h-screen bg-accent">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 animate-fade-in">
          人気のアニメグッズ
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SAMPLE_ITEMS.map((item) => (
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