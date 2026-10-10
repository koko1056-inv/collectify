import { ImageSearch as ImageSearchComponent } from '@/components/image-search/ImageSearch';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BackButton } from '@/components/navigation/BackButton';

const ImageSearch = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-8">
        {/* 以前は戻る手段が無かった */}
        <BackButton fallbackTo="/explore?tab=items" className="-ml-4 mb-2" />
        <ImageSearchComponent />
      </main>
      <Footer />
    </div>
  );
};

export default ImageSearch;