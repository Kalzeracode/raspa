import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface InfluencerChartsProps {
  referrals: Array<{
    id: string;
    commission_earned: number;
    created_at: string;
    profiles: { email: string };
  }>;
  clicks: Array<{
    id: string;
    created_at: string;
    converted: boolean;
  }>;
}

export function InfluencerCharts({ referrals, clicks }: InfluencerChartsProps) {
  // Process data for charts
  const processDataForCharts = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayReferrals = referrals.filter(r => 
        r.created_at.split('T')[0] === date
      );
      
      const dayClicks = clicks.filter(c => 
        c.created_at.split('T')[0] === date
      );

      const dayConversions = dayClicks.filter(c => c.converted);

      return {
        date,
        referrals: dayReferrals.length,
        clicks: dayClicks.length,
        conversions: dayConversions.length,
        earnings: dayReferrals.reduce((sum, r) => sum + r.commission_earned, 0),
        conversionRate: dayClicks.length > 0 ? (dayConversions.length / dayClicks.length) * 100 : 0
      };
    });
  };

  const chartData = processDataForCharts();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Referências e Cliques - Últimos 7 Dias</CardTitle>
          <CardDescription>Evolução diária de atividade</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
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
                dataKey="clicks" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Cliques"
              />
              <Line 
                type="monotone" 
                dataKey="conversions" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--accent))' }}
                name="Conversões"
              />
              <Line 
                type="monotone" 
                dataKey="referrals" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={{ fill: '#22c55e' }}
                name="Referências"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ganhos - Últimos 7 Dias</CardTitle>
          <CardDescription>Evolução dos ganhos por comissão</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
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
                formatter={(value, name) => [
                  name === 'Taxa de Conversão' 
                    ? `${Number(value).toFixed(1)}%` 
                    : `R$ ${Number(value).toFixed(2)}`, 
                  name
                ]}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="earnings" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
                name="Ganhos (R$)"
              />
              <Line 
                type="monotone" 
                dataKey="conversionRate" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: '#f59e0b' }}
                name="Taxa de Conversão (%)"
                yAxisId="right"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}