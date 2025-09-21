import { useAuth } from '@/contexts/AuthContext';
import { NewNavbar } from '@/components/NewNavbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Gift, TrendingUp, Calendar, Trophy } from 'lucide-react';

interface Jogada {
  id: string;
  resultado: boolean;
  premio_ganho: number;
  created_at: string;
  raspadinhas: {
    nome: string;
  };
}

interface CompraCredito {
  id: string;
  amount: number;
  status: string;
  method: string;
  created_at: string;
}

export default function Conta() {
  const { profile } = useAuth();
  const [jogadas, setJogadas] = useState<Jogada[]>([]);
  const [loading, setLoading] = useState(true);
  const [compras, setCompras] = useState<CompraCredito[]>([]);
  const [loadingCompras, setLoadingCompras] = useState(true);

  useEffect(() => {
    fetchJogadas();
    fetchCompras();
  }, []);

  const fetchJogadas = async () => {
    const { data } = await supabase
      .from('jogadas')
      .select(`
        *,
        raspadinhas (nome)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setJogadas(data);
    }
    setLoading(false);
  };

  const fetchCompras = async () => {
    const { data } = await supabase
      .from('credit_purchases')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setCompras(data as any);
    }
    setLoadingCompras(false);
  };

  const totalJogadas = jogadas.length;
  const jogadasGanhas = jogadas.filter(j => j.resultado).length;
  const totalGanho = jogadas.reduce((sum, j) => sum + (j.premio_ganho || 0), 0);
  const percentualVitorias = totalJogadas > 0 ? (jogadasGanhas / totalJogadas) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <NewNavbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Minha Conta</h1>
          
          {/* User Info */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Gift className="mr-2 h-4 w-4" />
                  Saldo Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  R$ {profile?.saldo?.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Trophy className="mr-2 h-4 w-4" />
                  Total Ganho
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {totalGanho.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Taxa de Vitórias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {percentualVitorias.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {jogadasGanhas} de {totalJogadas} jogadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="text-sm capitalize">
                  {profile?.role}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  {profile?.email}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Games */}
          <Card>
            <CardHeader>
              <CardTitle>Jogadas Recentes</CardTitle>
              <CardDescription>
                Suas últimas 10 jogadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : jogadas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Você ainda não fez nenhuma jogada
                </div>
              ) : (
                <div className="space-y-4">
                  {jogadas.map((jogada) => (
                    <div
                      key={jogada.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          jogada.resultado ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium">{jogada.raspadinhas?.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(jogada.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={jogada.resultado ? 'default' : 'secondary'}>
                          {jogada.resultado ? 'Ganhou' : 'Perdeu'}
                        </Badge>
                        {jogada.resultado && jogada.premio_ganho > 0 && (
                          <p className="text-sm text-green-600 font-medium mt-1">
                            +R$ {jogada.premio_ganho.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Credit Purchases */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Compras de Créditos</CardTitle>
              <CardDescription>Suas últimas 10 recargas</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCompras ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : compras.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Você ainda não fez nenhuma recarga
                </div>
              ) : (
                <div className="space-y-4">
                  {compras.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{c.method} • R$ {Number(c.amount).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge variant={c.status === 'approved' ? 'default' : c.status === 'pending' ? 'secondary' : 'destructive'}>
                        {c.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}