import { useEffect } from "react";
import { NewNavbar } from "@/components/NewNavbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { Footer } from "@/components/Footer";

export default function Contato() {
  useEffect(() => { document.title = "Contato • RaspeaE"; }, []);
  return (
    <div className="min-h-screen bg-background">
      <NewNavbar />
      <div className="rounded-xl overflow-hidden">
        <HeroCarousel />
      </div>
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-7xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-6">Fale Conosco</h1>
          <p className="text-muted-foreground mb-8 max-w-3xl">
            Precisa de ajuda? Entre em contato com nosso suporte. Responderemos o mais rápido possível.
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
