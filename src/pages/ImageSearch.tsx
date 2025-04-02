
import { ImageSearch as ImageSearchComponent } from '@/components/image-search/ImageSearch';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const ImageSearch = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 pt-20">
        <ImageSearchComponent />
      </main>
      <Footer />
    </div>
  );
};

export default ImageSearch;
