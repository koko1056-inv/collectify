import { ImageSearch as ImageSearchComponent } from '@/components/image-search/ImageSearch';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const ImageSearch = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-6">
        <ImageSearchComponent />
      </main>
      <Footer />
    </div>
  );
};

export default ImageSearch;