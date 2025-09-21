import { useAuth } from '@/contexts/AuthContext';
import { NewNavbar } from '@/components/NewNavbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, DollarSign, Link as LinkIcon, Eye, TrendingUp, Copy } from 'lucide-react';
import { InfluencerCharts } from '@/components/InfluencerCharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
interface InfluencerData {
  id: string;
  code: string;
  commission_rate: number;
  total_referrals: number;
  total_earnings: number;
  status: string;
}
interface Referral {
  id: string;
  commission_earned: number;
  created_at: string;
  profiles: {
    email: string;
  };
  first_deposit_value?: number;
  commission_value?: number;
  first_deposit_at?: string;
}
interface LinkClick {
  id: string;
  created_at: string;
  converted: boolean;
}
export default function Influencer() {
  const {
    profile
  } = useAuth();
  const [influencerData, setInfluencerData] = useState<InfluencerData | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [clicks, setClicks] = useState<LinkClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  useEffect(() => {
    if (profile?.role === 'influencer') {
      fetchInfluencerData();

      // Set up real-time updates using Supabase Realtime
      const channel = supabase.channel('influencer-dashboard-updates').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'referrals'
      }, () => fetchInfluencerData()).on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'link_clicks'
      }, () => fetchInfluencerData()).on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'influencers'
      }, () => fetchInfluencerData()).subscribe();

      // Fallback polling every 30 seconds
      const interval = setInterval(fetchInfluencerData, 30000);
      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [profile]);
  const fetchInfluencerData = async () => {
    if (!profile?.user_id) return;
    try {
      // Fetch influencer data
      const {
        data: influencer
      } = await supabase.from('influencers').select('*').eq('user_id', profile.user_id).single();
      if (influencer) {
        setInfluencerData(influencer);

        // Fetch referrals (without profiles join that's causing the error)
        const {
          data: referralsData
        } = await supabase.from('referrals').select('*').eq('influencer_id', influencer.id).order('created_at', {
          ascending: false
        });
        if (referralsData) {
          // Process referrals with user data and commission info
          const referralsWithUserData = [];
          for (const referral of referralsData) {
            // Get user profile for email
            const {
              data: userProfile
            } = await supabase.from('profiles').select('email').eq('user_id', referral.referred_user_id).single();
            referralsWithUserData.push({
              ...referral,
              profiles: {
                email: userProfile?.email || 'N/A'
              },
              commission_earned: referral.commission_value || 0
            });
          }
          setReferrals(referralsWithUserData as any);
        }

        // Fetch link clicks
        const {
          data: clicksData
        } = await supabase.from('link_clicks').select('*').eq('influencer_id', influencer.id).order('created_at', {
          ascending: false
        }).limit(50);
        if (clicksData) setClicks(clicksData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do influenciador:', error);
    } finally {
      setLoading(false);
    }
  };
  const copyReferralLink = () => {
    if (!influencerData) return;
    const link = `https://raspeae.com.br/?ref=${influencerData.code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link de referência foi copiado para a área de transferência."
    });
  };
  const requestWithdrawal = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Erro",
        description: "Digite um valor válido.",
        variant: "destructive"
      });
      return;
    }
    if (!pixKey) {
      toast({
        title: "Erro",
        description: "Digite sua chave PIX.",
        variant: "destructive"
      });
      return;
    }
    if (!influencerData || parseFloat(withdrawAmount) > influencerData.total_earnings) {
      toast({
        title: "Erro",
        description: "Valor superior aos ganhos disponíveis.",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('withdrawal_requests').insert({
        user_id: profile?.user_id,
        amount: parseFloat(withdrawAmount),
        payment_method: 'PIX',
        payment_details: {
          pix_key: pixKey
        }
      });
      if (error) throw error;
      toast({
        title: "Sucesso!",
        description: "Solicitação de saque enviada. Aguarde a aprovação."
      });
      setWithdrawAmount('');
      setPixKey('');
      setShowWithdrawModal(false);
    } catch (error) {
      console.error('Erro ao solicitar saque:', error);
      toast({
        title: "Erro",
        description: "Não foi possível solicitar o saque.",
        variant: "destructive"
      });
    }
  };
  if (profile?.role !== 'influencer') {
    return <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <NewNavbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-destructive">Acesso Negado</h1>
          <p className="text-muted-foreground">Apenas influenciadores podem acessar esta página.</p>
        </div>
      </div>;
  }
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <NewNavbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>;
  }
  const totalClicks = clicks.length;
  const conversions = clicks.filter(c => c.converted).length;
  const conversionRate = totalClicks > 0 ? (conversions / totalClicks * 100).toFixed(1) : '0';
  return <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <NewNavbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">Painel do Influenciador</h1>
            <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Solicitar Saque
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar Saque</DialogTitle>
                  <DialogDescription>
                    Disponível para saque: R$ {influencerData?.total_earnings.toFixed(2) || '0.00'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input id="amount" type="number" step="0.01" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <Label htmlFor="pix">Chave PIX</Label>
                    <Input id="pix" value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="Digite sua chave PIX" />
                  </div>
                  <Button onClick={requestWithdrawal} className="w-full">
                    Solicitar Saque
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Referidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{influencerData?.total_referrals || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Comissão Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {influencerData?.total_earnings.toFixed(2) || '0.00'}
                </div>
                
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Eye className="mr-2 h-4 w-4" />
                  Cliques no Link
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClicks}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Taxa de Conversão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{conversionRate}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Link */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Seu Link de Referência</CardTitle>
              <CardDescription>
                Compartilhe este link para ganhar 50% do primeiro depósito de cada novo usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <div className="p-3 sm:p-4 bg-muted rounded-lg text-center">
                    <div className="text-sm sm:text-lg font-semibold text-primary mb-2 break-all">
                      raspeae.com.br/?ref={influencerData?.code}
                    </div>
                  </div>
                </div>
                <Button onClick={copyReferralLink} size="sm" className="w-full sm:w-auto">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Charts */}
          <InfluencerCharts referrals={referrals} clicks={clicks} />

          {/* Referrals Table */}
          <Card className="mb-8 mt-8">
            <CardHeader>
              <CardTitle>Seus Referidos</CardTitle>
              <CardDescription>Usuários que se cadastraram através do seu link</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Primeiro Depósito</TableHead>
                    <TableHead>Comissão (50%)</TableHead>
                    <TableHead>Data do Depósito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.length === 0 ? <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum referido ainda
                      </TableCell>
                    </TableRow> : referrals.map(referral => <TableRow key={referral.id}>
                        <TableCell className="font-medium">{referral.profiles?.email}</TableCell>
                        <TableCell>
                          {referral.first_deposit_value ? `R$ ${referral.first_deposit_value.toFixed(2)}` : 'Aguardando depósito'}
                        </TableCell>
                        <TableCell>
                          {referral.commission_value ? `R$ ${referral.commission_value.toFixed(2)}` : 'R$ 0,00'}
                        </TableCell>
                        <TableCell>
                          {referral.first_deposit_at ? new Date(referral.first_deposit_at).toLocaleDateString('pt-BR') : 'Sem depósito'}
                        </TableCell>
                      </TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Click Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Cliques</CardTitle>
              <CardDescription>Últimos 50 cliques no seu link</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clicks.length === 0 ? <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Nenhum clique ainda
                      </TableCell>
                    </TableRow> : clicks.map(click => <TableRow key={click.id}>
                        <TableCell>
                          {new Date(click.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={click.converted ? "default" : "secondary"}>
                            {click.converted ? "Convertido" : "Visualização"}
                          </Badge>
                        </TableCell>
                      </TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>;
}