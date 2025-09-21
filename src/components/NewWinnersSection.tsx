import { useState, useEffect } from 'react';

export function NewWinnersSection() {
  const [winners, setWinners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Nomes mais realistas separados por gênero
    const maleNames = [
      'João S.', 'Pedro L.', 'Lucas R.', 'Bruno T.', 'Diego V.',
      'Rafael N.', 'Thiago H.', 'Gabriel K.', 'Rodrigo X.', 'Felipe J.',
      'André U.', 'Mateus O.', 'Carlos A.', 'Eduardo M.', 'Fernando B.',
      'Gustavo P.', 'Henrique L.', 'Igor V.', 'José R.', 'Leonardo T.'
    ];
    
    const femaleNames = [
      'Ana C.', 'Maria F.', 'Carla M.', 'Sofia P.', 'Fernanda A.',
      'Camila B.', 'Juliana G.', 'Larissa W.', 'Patricia Z.', 'Beatriz Q.',
      'Mariana Y.', 'Isabela I.', 'Carolina E.', 'Amanda S.', 'Bianca N.',
      'Cristina H.', 'Daniela K.', 'Elaine M.', 'Fabiana R.', 'Giovana L.'
    ];
    
    // Valores mais realistas e variados
    const amounts = [
      245, 380, 520, 750, 890, 1200, 1450, 1680, 1950, 2300,
      2750, 3100, 3650, 4200, 4850, 5500, 6200, 7800, 8900, 12500,
      15000, 18500, 22000, 25000, 30000
    ];
    
    // Emojis mais variados
    const emojis = ['🎉', '🏆', '💰', '🎊', '🥳', '💎', '⭐', '🎁', '🔥', '💸', '🚀', '🎯'];
    
    // Tempos mais realistas
    const timeOptions = [
      '2 min', '5 min', '8 min', '12 min', '15 min', '18 min', '22 min', 
      '28 min', '35 min', '42 min', '1h 5min', '1h 18min', '1h 32min', '2h 15min'
    ];

    // Estados brasileiros para mais realismo
    const locations = [
      'SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'GO', 'PE', 'CE', 
      'PA', 'MT', 'MS', 'DF', 'ES', 'RN', 'PB', 'AL', 'SE', 'TO'
    ];

    // Gerar dados mais realistas
    const generateWinners = () => {
      const winnersData = [];
      
      for (let i = 0; i < 30; i++) {
        const isMan = Math.random() > 0.5;
        const selectedNames = isMan ? maleNames : femaleNames;
        const name = selectedNames[Math.floor(Math.random() * selectedNames.length)];
        
        const baseAmount = amounts[Math.floor(Math.random() * amounts.length)];
        // Adicionar variação pequena para parecer mais real
        const variation = Math.floor(Math.random() * 100) - 50;
        const finalAmount = Math.max(100, baseAmount + variation);
        
        // Usar diferentes ranges de avatar para homens e mulheres
        const avatarId = isMan 
          ? Math.floor(Math.random() * 50) + 1  // IDs 1-50 para homens
          : Math.floor(Math.random() * 50) + 51; // IDs 51-100 para mulheres
        
        winnersData.push({
          id: Date.now() + i, // ID único baseado em timestamp
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          name: name,
          amount: finalAmount,
          time: timeOptions[Math.floor(Math.random() * timeOptions.length)],
          location: locations[Math.floor(Math.random() * locations.length)],
          isMan: isMan,
          imageUrl: `https://randomuser.me/api/portraits/${isMan ? 'men' : 'women'}/${Math.floor(Math.random() * 99) + 1}.jpg`
        });
      }
      
      // Embaralhar o array para ordem aleatória
      return winnersData.sort(() => Math.random() - 0.5);
    };

    setWinners(generateWinners());
  }, []);

  // Animação mais suave e realista
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % winners.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [winners.length]);

  if (winners.length === 0) return null;

  return (
    <section className="relative w-full bg-gradient-to-r from-emerald-900/20 via-green-800/20 to-teal-900/20 backdrop-blur-sm border-y border-green-500/20 py-4">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/5 to-transparent"></div>
      
      <div className="relative px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Vencedores Recentes</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <div className="relative overflow-hidden">
          <div className="animate-marquee whitespace-nowrap flex">
            {/* Duplicar para loop contínuo */}
            {[...winners, ...winners].map((winner, index) => (
              <div
                key={`${winner.id}-${index}`}
                className="inline-flex items-center gap-3 mx-6 md:mx-8 flex-shrink-0 bg-white/5 rounded-full px-4 py-2 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
              >
                <span className="text-xl">{winner.emoji}</span>
                
                <img 
                  src={winner.imageUrl} 
                  alt="Vencedor" 
                  className="w-7 h-7 md:w-9 md:h-9 rounded-full object-cover border-2 border-green-400/50"
                  onError={(e) => {
                    // Fallback mais específico por gênero
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${winner.name}&background=059669&color=fff&size=36`;
                  }}
                />
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm md:text-base">
                    <span>{winner.name}</span>
                    <span className="text-green-400 text-xs bg-green-400/20 px-1.5 py-0.5 rounded">
                      {winner.location}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300">
                    <span className="text-green-400 font-bold">
                      R$ {winner.amount.toLocaleString('pt-BR')}
                    </span>
                    <span className="mx-1">•</span>
                    <span>há {winner.time}</span>
                  </div>
                </div>
                
                <div className="hidden md:flex items-center text-green-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Indicador de ao vivo */}
        <div className="flex items-center justify-center mt-2">
          <div className="flex items-center gap-1 text-xs text-green-400">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
            <span>AO VIVO</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        .animate-marquee {
          animation: marquee 45s linear infinite;
        }
        
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}