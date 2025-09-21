import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Gift, TrendingUp, DollarSign, Activity, Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface AdminStats {
  total_users: number;
  total_deposits_amount: number;
  total_bets_count: number;
  daily_data: Array<{
    date: string;
    users: number;
    games: number;
    revenue: number;
    revenue_simulated?: number;
  }>;
  recent_activity: Array<{
    type: string;
    description: string;
    amount: number;
    timestamp: string;
  }>;
  revenue_real?: number;
  revenue_simulated?: number;
}

interface AdminDashboardProps {
  users: any[];
  jogadas: any[];
  influencers: any[];
  withdrawals: any[];
  creditPurchases: any[];
}

export function AdminDashboard({ users, jogadas, influencers, withdrawals, creditPurchases }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminStats();
    
    // Set up real-time updates using Supabase Realtime
    const channel = supabase
      .channel('admin-dashboard-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'jogadas' },
        () => loadAdminStats()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        () => loadAdminStats()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'credit_purchases' },
        () => loadAdminStats()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'withdrawal_requests' },
        () => loadAdminStats()
      )
      .subscribe();

    // Fallback polling every 30 seconds
    const interval = setInterval(loadAdminStats, 30000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const loadAdminStats = async () => {
    try {
      // Use the new version with real vs simulated data
      const { data, error } = await supabase.rpc('get_admin_stats_v2');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const statsData = data[0];
        setStats({
          total_users: statsData.total_users,
          total_deposits_amount: statsData.total_deposits_amount || 0,
          total_bets_count: statsData.total_bets_count,
          daily_data: (statsData.daily_data as any) || [],
          recent_activity: (statsData.recent_activity as any) || [],
          revenue_real: statsData.revenue_real || 0,
          revenue_simulated: statsData.revenue_simulated || 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas do admin:', error);
      // Set default values if RPC fails
      setStats({
        total_users: users.length,
        total_deposits_amount: 0,
        total_bets_count: jogadas.length,
        daily_data: [],
        recent_activity: [],
        revenue_real: 0,
        revenue_simulated: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Fallback calculations if RPC fails
  const totalUsers = stats?.total_users || users.length;
  const totalJogadas = stats?.total_bets_count || jogadas.length;
  const totalPremios = jogadas.reduce((sum, j) => sum + (Number(j.premio_ganho) || 0), 0);
  const totalInfluencers = influencers.filter(inf => inf.profiles?.email).length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
  const totalRevenue = stats?.revenue_real || 0;
  const totalRevenueSimulated = stats?.revenue_simulated || 0;

  // Estatísticas simples
  const recentGames = jogadas.slice(-5);
  const winRate = totalJogadas > 0 ? ((jogadas.filter(j => j.resultado).length / totalJogadas) * 100) : 0;
  const recentUsers = users.filter(u => new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
  const profit = totalRevenue - totalPremios;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="gaming-card">
              <CardContent className="p-6">
                <div className="h-20 bg-secondary/30 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="gaming-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{recentUsers} esta semana
            </p>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jogadas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalJogadas}</div>
            <p className="text-xs text-muted-foreground">
              {winRate.toFixed(1)}% taxa de vitória
            </p>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prêmios Pagos</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">R$ {totalPremios.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {jogadas.filter(j => j.resultado).length} vitórias
            </p>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Influenciadores</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalInfluencers}</div>
            <p className="text-xs text-muted-foreground">
              {influencers.reduce((sum, inf) => sum + (inf.total_referrals || 0), 0)} referências
            </p>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saques Pendentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingWithdrawals}</div>
            <p className="text-xs text-muted-foreground">
              R$ {withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + Number(w.amount), 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <div className="text-xl font-bold text-primary">R$ {totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Receita Real</p>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-500">R$ {totalRevenueSimulated.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Receita Simulada</p>
              </div>
              <div className="pt-2">
                <div className="text-sm font-medium">
                  Lucro: R$ {(totalRevenue - totalPremios).toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Estatísticas dos Últimos 7 Dias */}
      {stats?.daily_data && stats.daily_data.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle>Usuários e Jogos - Últimos 7 Dias</CardTitle>
              <CardDescription>Evolução diária de atividade</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.daily_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Usuários"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="games" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--accent))' }}
                    name="Jogos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="gaming-card">
            <CardHeader>
              <CardTitle>Receita - Últimos 7 Dias</CardTitle>
              <CardDescription>Real vs Simulada</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.daily_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                    formatter={(value, name) => [`R$ ${Number(value).toFixed(2)}`, name]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1"
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                    name="Receita Real"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue_simulated" 
                    stackId="1"
                    stroke="hsl(var(--amber-500))" 
                    fill="hsl(var(--amber-500))"
                    fillOpacity={0.4}
                    name="Receita Simulada"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Últimas Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle>Últimas Jogadas</CardTitle>
            <CardDescription>5 jogadas mais recentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentGames.map((game, index) => (
                <div key={game.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${game.resultado ? 'bg-primary gaming-glow' : 'bg-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-medium">{game.profiles?.email || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground">{game.raspadinhas?.nome || 'Raspadinha'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${game.resultado ? 'text-primary' : 'text-muted-foreground'}`}>
                      {game.resultado ? `+R$ ${Number(game.premio_ganho || 0).toFixed(2)}` : 'Sem prêmio'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(game.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
            <CardDescription>Visão geral das finanças</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Receita Real</span>
                <span className="font-bold text-primary">R$ {totalRevenue.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Receita Simulada</span>
                <span className="font-bold text-amber-500">R$ {totalRevenueSimulated.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Prêmios Pagos</span>
                <span className="font-bold text-destructive">-R$ {totalPremios.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Saques Pendentes</span>
                <span className="font-bold text-amber-500">
                  -R$ {withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + Number(w.amount), 0).toFixed(2)}
                </span>
              </div>
              
              <hr className="border-border" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Lucro Líquido (Real)</span>
                <span className={`font-bold text-lg ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  R$ {profit.toFixed(2)}
                </span>
              </div>
              
              {/* Margem de lucro */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Margem de Lucro</span>
                  <span className="font-medium">
                    {totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <Progress 
                  value={totalRevenue > 0 ? Math.max(0, Math.min(100, (profit / totalRevenue) * 100)) : 0} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Taxa de Vitórias vs Derrotas */}
      <Card className="gaming-card">
        <CardHeader>
          <CardTitle>Taxa de Vitórias vs Derrotas</CardTitle>
          <CardDescription>Distribuição dos resultados dos jogos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Vitórias ({jogadas.filter(j => j.resultado).length})</span>
              <span>Derrotas ({jogadas.filter(j => !j.resultado).length})</span>
            </div>
            <div className="w-full bg-secondary/30 rounded-full h-6 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 gaming-glow"
                style={{ width: `${winRate}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Vitória</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{(100 - winRate).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Derrota</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{totalJogadas}</p>
                <p className="text-xs text-muted-foreground">Total Jogadas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}