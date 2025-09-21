import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonAction: () => void;
}

export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const heroSlides: HeroSlide[] = [
    {
      id: '1',
      title: 'Ganhe até R$ 1.000',
      subtitle: 'Raspadinhas Premium com PIX instantâneo',
      imageUrl: 'https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/Whisk_01b8f9f468d3d0e9fbe42de5277efaaedr%20(1).jpeg',
      buttonText: 'Começar Agora',
      buttonAction: () => navigate('/raspadinhas')
    },
    {
      id: '2',
      title: 'Sistema de Afiliados',
      subtitle: 'Convide amigos e ganhe comissões',
      imageUrl: 'https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/Whisk_60784d326edfecab16c436bfb5e8f4d0eg.png',
      buttonText: 'Ser Afiliado',
      buttonAction: () => navigate('/afiliados')
    },
    {
      id: '3',
      title: 'Jogos Diários',
      subtitle: 'Novas oportunidades todos os dias',
      imageUrl: 'https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/Whisk_ced5c9317067445bc9549219e889a296dr%20(1).jpeg',
      buttonText: 'Ver Jogos',
      buttonAction: () => navigate('/raspadinhas')
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  return (
    <div className="relative h-64 md:h-80 rounded-xl overflow-hidden group">
      {/* Background slides */}
      <div className="absolute inset-0">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center justify-start p-6 md:p-8">
        <div className="text-white max-w-md">
          <h3 className="text-2xl md:text-3xl font-bold mb-2">
            {heroSlides[currentSlide].title}
          </h3>
          <p className="text-sm md:text-base text-gray-200 mb-4">
            {heroSlides[currentSlide].subtitle}
          </p>
          <Button 
            onClick={heroSlides[currentSlide].buttonAction}
            className="gaming-button"
          >
            {heroSlides[currentSlide].buttonText}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <button
        onClick={prevSlide}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentSlide ? 'bg-white' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}