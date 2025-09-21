import { useEffect } from "react";
import { NewNavbar } from "@/components/NewNavbar";
import { Footer } from "@/components/Footer";
import { HeroCarousel } from "@/components/HeroCarousel";

export default function Sobre() {
  useEffect(() => { document.title = "Sobre • RaspeaE"; }, []);

  return (
    <div className="min-h-screen bg-background">
      <NewNavbar />
      <div className="rounded-xl overflow-hidden">
        <HeroCarousel />
      </div>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-7xl">

          {/* Título */}
          <h1 className="text-3xl md:text-5xl font-extrabold mb-10">Sobre a RaspeaE</h1>

          {/* O que fazemos */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">O que fazemos</h2>
            <p className="text-muted-foreground leading-relaxed max-w-3xl mb-4">
              A <strong>RaspeaE</strong> é uma plataforma de <em>entretenimento socialmente responsável</em>. 
              Criamos raspadinhas virtuais que funcionam como incentivo à doação para 
              instituições de caridade e projetos sociais no Brasil.
            </p>
            <p className="text-muted-foreground leading-relaxed max-w-3xl">
              Cada contribuição feita na plataforma gera acesso a jogos promocionais 
              com prêmios em dinheiro, pagos via <strong>PIX instantâneo</strong>. 
              Dessa forma, nossos usuários participam de uma experiência divertida, 
              segura e ao mesmo tempo ajudam a transformar vidas.
            </p>
          </div>

          {/* Base legal */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Segurança Jurídica</h2>
            <p className="text-muted-foreground leading-relaxed max-w-3xl mb-4">
              Atuamos em total conformidade com a legislação brasileira, especialmente:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 max-w-3xl">
              <li><strong>Lei nº 5.768/1971</strong> – Dispõe sobre a distribuição gratuita de prêmios.</li>
              <li><strong>Decreto nº 70.951/1972</strong> – Regulamenta as promoções comerciais no país.</li>
              <li><strong>Portaria SEAE/ME nº 7.638/2022</strong> – Estabelece normas para sorteios e promoções.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed max-w-3xl mt-4">
              Nosso modelo de operação é enquadrado como <em>promoção comercial</em>, 
              com todas as autorizações necessárias junto à <strong>Secretaria de Prêmios e Apostas</strong> 
              (antiga SEAE/Ministério da Fazenda). Assim, garantimos transparência e legitimidade.
            </p>
          </div>

          {/* Regras claras */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Regras de Participação</h2>
            <ol className="list-decimal list-inside text-muted-foreground space-y-2 max-w-3xl">
              <li>Somente maiores de 18 anos podem participar.</li>
              <li>Cada doação gera créditos equivalentes a raspadinhas virtuais.</li>
              <li>Prêmios são pagos exclusivamente via PIX em até 48h após validação.</li>
              <li>Relatórios de impacto social são publicados trimestralmente.</li>
              <li>Instituições beneficiadas são auditadas e previamente credenciadas.</li>
            </ol>
          </div>

          {/* Números e impacto */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mb-12">
            <div>
              <p className="text-4xl font-extrabold text-primary">+R$ 5Mi</p>
              <p className="text-muted-foreground">em doações arrecadadas</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-primary">+200 mil</p>
              <p className="text-muted-foreground">usuários ativos</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-primary">+50</p>
              <p className="text-muted-foreground">instituições apoiadas</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-primary">100%</p>
              <p className="text-muted-foreground">transparência comprovada</p>
            </div>
          </div>

          {/* Chamada final */}
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              RaspeaE é mais do que sorte: é solidariedade
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Participe hoje mesmo, divirta-se e ajude a transformar vidas dentro da lei.
            </p>
            <a 
              href="/doar"
              className="px-6 py-3 rounded-2xl bg-primary text-white font-semibold hover:bg-primary/90 transition"
            >
              Faça Sua Doação
            </a>
          </div>

        </div>
      </section>
      <Footer />
    </div>
  );
}
