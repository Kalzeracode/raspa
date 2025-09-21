import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NewNavbar } from '@/components/NewNavbar';
import { Footer } from '@/components/Footer';
import { Users, Copy, Share2, TrendingUp, Star, Gift, Award, DollarSign, Crown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserLevel {
  level: 'bronze' | 'prata' | 'ouro' | 'diamante';
  qualified_referrals: number;
  bonuses_claimed: number;
  total_bonus_earned: number;
  created_at?: string;
  updated_at?: string;
  id?: string;
  user_id?: string;
}

interface UserReferral {
  id: string;
  referred_user_id: string;
  created_at: string;
  has_qualified: boolean;
  qualified_at: string | null;
}

interface BonusClaim {
  id: string;
  amount: number;
  milestone: number;
  level_achieved: string;
  claimed_at: string;
}

const getLevelInfo = (level: string) => {
  switch (level) {
    case 'prata':
      return { icon: '🥈', name: 'Prata', color: 'bg-gray-100 text-gray-800', min: 25 };
    case 'ouro':
      return { icon: '🥇', name: 'Ouro', color: 'bg-yellow-100 text-yellow-800', min: 50 };
    case 'diamante':
      return { icon: '💎', name: 'Diamante', color: 'bg-blue-100 text-blue-800', min: 75 };
    default:
      return { icon: '🥉', name: 'Bronze', color: 'bg-orange-100 text-orange-800', min: 0 };
  }
};

export default function Afiliados() {
  const { user, profile } = useAuth();
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [referrals, setReferrals] = useState<UserReferral[]>([]);
  const [bonusClaims, setBonusClaims] = useState<BonusClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [pixKey, setPixKey] = useState('');
  const [claimingBonus, setClaimingBonus] = useState(false);

  useEffect(() => {
    if (user && profile) {
      fetchUserData();
    }
  }, [user, profile]);

  const fetchUserData = async () => {
    try {
      // Get user level data
      const { data: levelData } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      setUserLevel(levelData as UserLevel);

      // Get user referrals
      const { data: referralsData } = await supabase
        .from('user_referrals')
        .select('*')
        .eq('referrer_user_id', user?.id)
        .order('created_at', { ascending: false });

      setReferrals(referralsData || []);

      // Get bonus claims
      const { data: claimsData } = await supabase
        .from('bonus_claims')
        .select('*')
        .eq('user_id', user?.id)
        .order('claimed_at', { ascending: false });

      setBonusClaims(claimsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralLink = () => {
    if (user?.id) {
      return `${window.location.origin}?ref=${user.id}`;
    }
    return '';
  };

  const copyReferralLink = () => {
    const link = generateReferralLink();
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  const shareReferralLink = () => {
    const link = generateReferralLink();
    if (navigator.share && link) {
      navigator.share({
        title: 'Participe da Raspadinha do Lek!',
        text: 'Venha jogar e ganhar prêmios incríveis comigo! Indique amigos e ganhe R$50 no PIX!',
        url: link,
      });
    } else {
      copyReferralLink();
    }
  };

  const handleClaimBonus = async () => {
    if (!pixKey.trim()) {
      toast.error('Digite sua chave PIX');
      return;
    }

    setClaimingBonus(true);
    try {
      const { data: result, error } = await supabase.rpc('claim_referral_bonus', {
        pix_key_param: pixKey
      });

      if (error) throw error;

      const response = result as { success: boolean; message: string };
      if (response.success) {
        toast.success(response.message);
        fetchUserData(); // Refresh data
        setPixKey('');
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error('Erro ao solicitar bônus:', error);
      toast.error('Erro ao solicitar bônus');
    } finally {
      setClaimingBonus(false);
    }
  };

  const qualifiedReferrals = referrals.filter(r => r.has_qualified).length;
  const nextMilestone = userLevel ? (userLevel.bonuses_claimed + 1) * 25 : 25;
  const progressToNext = Math.min((qualifiedReferrals / nextMilestone) * 100, 100);
  const canClaimBonus = qualifiedReferrals >= nextMilestone && (userLevel?.bonuses_claimed || 0) < 3;

  const currentLevelInfo = getLevelInfo(userLevel?.level || 'bronze');

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <NewNavbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Acesso Necessário</CardTitle>
              <CardDescription>
                Você precisa estar logado para acessar o programa de indicações.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => window.location.href = '/auth'}>
                Fazer Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NewNavbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NewNavbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
            🎯 Programa de Indicações
          </h1>
          <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto">
            Indique amigos e ganhe R$ 50,00 no PIX a cada 25 indicações que depositarem pelo menos R$ 10,00!
          </p>
        </div>

        <div className="space-y-6">
          {/* Level Card */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Crown className="h-6 w-6 text-primary" />
                  Seu Nível
                </span>
                <Badge className={currentLevelInfo.color}>
                  {currentLevelInfo.icon} {currentLevelInfo.name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{qualifiedReferrals}</div>
                  <p className="text-sm text-muted-foreground">Indicações Qualificadas</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    R$ {(userLevel?.total_bonus_earned || 0).toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Ganho</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userLevel?.bonuses_claimed || 0}/3</div>
                  <p className="text-sm text-muted-foreground">Bônus Resgatados</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{Math.max(0, nextMilestone - qualifiedReferrals)}</div>
                  <p className="text-sm text-muted-foreground">Para Próximo Bônus</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso para próximo bônus</span>
                  <span>{qualifiedReferrals}/{nextMilestone}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progressToNext}%` }}
                  ></div>
                </div>
              </div>

              {/* Claim Bonus Button */}
              {canClaimBonus && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full gaming-button" size="lg">
                      <Gift className="mr-2 h-5 w-5" />
                      Resgatar R$ 50,00 no PIX
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Resgatar Bônus</DialogTitle>
                      <DialogDescription>
                        Parabéns! Você atingiu {nextMilestone} indicações qualificadas. 
                        Digite sua chave PIX para receber R$ 50,00.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="pixKey">Chave PIX</Label>
                        <Input
                          id="pixKey"
                          placeholder="Digite sua chave PIX (CPF, email, telefone ou chave aleatória)"
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={handleClaimBonus} 
                        disabled={claimingBonus}
                        className="gaming-button"
                      >
                        {claimingBonus ? 'Processando...' : 'Solicitar Pagamento'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* How it Works */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle>Como Funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-4">
                  <div className="text-3xl mb-2">1️⃣</div>
                  <h3 className="font-semibold mb-2">Convide Amigos</h3>
                  <p className="text-sm text-muted-foreground">
                    Compartilhe seu link único de indicação
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="text-3xl mb-2">2️⃣</div>
                  <h3 className="font-semibold mb-2">Eles Se Cadastram</h3>
                  <p className="text-sm text-muted-foreground">
                    Amigos criam conta usando seu link
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="text-3xl mb-2">3️⃣</div>
                  <h3 className="font-semibold mb-2">Fazem Depósito</h3>
                  <p className="text-sm text-muted-foreground">
                    Depositam pelo menos R$ 10,00
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="text-3xl mb-2">🎁</div>
                  <h3 className="font-semibold mb-2">Você Ganha</h3>
                  <p className="text-sm text-muted-foreground">
                    R$ 50,00 a cada 25 indicações
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Link */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Seu Link de Indicação
              </CardTitle>
              <CardDescription>
                Compartilhe este link para suas indicações contarem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  value={generateReferralLink()} 
                  readOnly 
                  className="flex-1"
                />
                <Button onClick={copyReferralLink} variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button onClick={shareReferralLink} className="gaming-button">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Levels System */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle>Sistema de Níveis</CardTitle>
              <CardDescription>
                Evolua de nível conforme suas indicações e ganhe reconhecimento!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { level: 'bronze', name: 'Bronze', icon: '🥉', req: '0-24', color: 'bg-orange-100 text-orange-800' },
                  { level: 'prata', name: 'Prata', icon: '🥈', req: '25-49', color: 'bg-gray-100 text-gray-800' },
                  { level: 'ouro', name: 'Ouro', icon: '🥇', req: '50-74', color: 'bg-yellow-100 text-yellow-800' },
                  { level: 'diamante', name: 'Diamante', icon: '💎', req: '75+', color: 'bg-blue-100 text-blue-800' }
                ].map((lvl) => (
                  <div 
                    key={lvl.level}
                    className={`p-4 rounded-lg text-center ${
                      userLevel?.level === lvl.level ? 'ring-2 ring-primary' : 'bg-secondary/20'
                    }`}
                  >
                    <div className="text-2xl mb-2">{lvl.icon}</div>
                    <Badge className={lvl.color}>{lvl.name}</Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      {lvl.req} indicações
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Referrals */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle>Suas Indicações</CardTitle>
              <CardDescription>
                Acompanhe suas indicações e seus status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length > 0 ? (
                <div className="space-y-3">
                  {referrals.slice(0, 10).map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Indicação</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={referral.has_qualified ? "default" : "secondary"}>
                          {referral.has_qualified ? '✅ Qualificada' : '⏳ Pendente'}
                        </Badge>
                        {referral.qualified_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Qualificada em {new Date(referral.qualified_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma indicação ainda. Comece compartilhando seu link!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bonus Claims History */}
          {bonusClaims.length > 0 && (
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle>Histórico de Bônus</CardTitle>
                <CardDescription>
                  Seus bônus resgatados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bonusClaims.map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Gift className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Bônus {getLevelInfo(claim.level_achieved).name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(claim.claimed_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          +R$ {claim.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {claim.milestone} indicações
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}