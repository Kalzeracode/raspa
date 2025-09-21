import { Link } from "react-router-dom";
export function Footer() {
  const year = new Date().getFullYear();
  return <footer className="border-t bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-10 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm" />
              <span className="font-bold text-xl text-left">Raspadinha Do LEK</span>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              A melhor plataforma de raspadinhas online do Brasil. PIX na hora e prêmios incríveis.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Institucional</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/sobre" className="text-muted-foreground hover:text-foreground transition-colors">Sobre nós</Link></li>
              <li><Link to="/regras" className="text-muted-foreground hover:text-foreground transition-colors">Regras e Prêmios</Link></li>
              <li><Link to="/contato" className="text-muted-foreground hover:text-foreground transition-colors">Contato</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/termos" className="text-muted-foreground hover:text-foreground transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="text-muted-foreground hover:text-foreground transition-colors">Política de Privacidade</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Redes</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Instagram</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Twitter/X</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Telegram</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="container mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {year} RaspeaE. Todos os direitos reservados.</p>
          <div className="flex items-center gap-3">
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
            <span>•</span>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>;
}