// /src/components/SimpleHeroCarousel.tsx

import { useState, useEffect } from 'react';

// ... (const carouselImages não precisa mudar)
const carouselImages = [
  'https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/Whisk_01b8f9f468d3d0e9fbe42de5277efaaedr%20(1).jpeg',
  'https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/Whisk_fce1258f42c73f785b6440a6b055169fdr.jpeg',
  'https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/Whisk_60784d326edfecab16c436bfb5e8f4d0eg.png'
];


export function SimpleHeroCarousel() {
  // ... (lógica do useState e useEffect não precisa mudar)
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    // ADICIONE A MARGEM AQUI
    // Experimente com mt-16, mt-20, etc., até encontrar o valor perfeito.
    <section className="relative w-full aspect-video overflow-hidden">
      
      {carouselImages.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={image}
            alt={`Banner promocional ${index + 1}`}
            className="w-full h-full object-contain object-center"
          />
        </div>
      ))}
    </section>
  );
}