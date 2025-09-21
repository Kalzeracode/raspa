import { useAuth } from '@/contexts/AuthContext';
import { NewNavbar } from '@/components/NewNavbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Edit, Trash2, UserPlus, DollarSign, CheckCircle, XCircle, Link as LinkIcon,
  RefreshCcw, Search, Filter, Users, Gift, Wallet, ShoppingBag, Megaphone
} from 'lucide-react';
import { AdminDashboard } from '@/components/AdminDashboard';
import { PersonalizationTab } from '@/components/PersonalizationTab';
import { AdminSidebar } from '@/components/AdminSidebar';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  role: string;
  saldo: number;
  created_at: string;
}

interface Raspadinha {
  id: string;
  nome: string;
  imagem_url?: string;
  premio: number;
  cash_payout: number;
  chances: number;
  ativo: boolean;
  created_at: string;
}

interface Jogada {
  id: string;
  user_id?: string;
  raspadinha_id?: string;
  resultado: boolean;
  premio_ganho: number;
  created_at: string;
  profiles: { email: string };
  raspadinhas: { nome: string };
}

interface Influencer {
  id: string;
  user_id: string;
  code: string;
  commission_rate: number;
  total_referrals: number;
  total_earnings: number;
  status: string;
  created_at: string;
  profiles: { email: string };
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_details: any;
  admin_notes?: string;
  requested_at: string;
  profiles: { email: string };
}

interface CreditPurchase {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  method: string;
  created_at: string;
  profiles: { email: string };
}

/** â€”â€”â€”â€”â€”â€”â€”â€”â€”â€” Pequenos helpers visuais â€”â€”â€”â€”â€”â€”â€”â€”â€”â€” */
function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="rounded-2xl p-3 bg-muted">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold truncate">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  title,
  description,
  children,
}: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div>
        <h3 className="text-base md:text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

export default function Admin() {
  const { profile } = useAuth();

  const [users, setUsers] = useState<Profile[]>([]);
  const [raspadinhas, setRaspadinhas] = useState<Raspadinha[]>([]);
  const [jogadas, setJogadas] = useState<Jogada[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [creditPurchases, setCreditPurchases] = useState<CreditPurchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // dialogs
  const [showNewRaspadinha, setShowNewRaspadinha] = useState(false);
  const [showNewInfluencer, setShowNewInfluencer] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [showEditInfluencer, setShowEditInfluencer] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(null);
  const [editInfluencerForm, setEditInfluencerForm] = useState<{
    code: string;
    commission_rate: string;
    status: Influencer['status'];
  }>({ code: '', commission_rate: '10', status: 'active' });
  const [creatingInfluencer, setCreatingInfluencer] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // tabs + search
  const [activeTab, setActiveTab] = useState('overview');
  const [searchRasp, setSearchRasp] = useState('');
  const [searchUser, setSearchUser] = useState('');

  // raspadinha editing
  const [editingRaspadinha, setEditingRaspadinha] = useState<string | null>(null);
  const [editRaspadinha, setEditRaspadinha] = useState({ nome: '', premio: '', chances: '', cash_payout: '' });

  const [newRaspadinha, setNewRaspadinha] = useState({
    nome: '',
    premio: '',
    chances: '',
    cash_payout: '',
    imagem: null as File | null,
  });

  const [newInfluencer, setNewInfluencer] = useState({
    email: '',
    commission_rate: '10',
    password: '',
    createNew: false,
    code: '',
    starting_balance: '0',
  });

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'user',
    starting_balance: '0',
  });

  useEffect(() => {
    if (profile?.role === 'admin') fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast({ title: 'Atualizado', description: 'Dados recarregados.' });
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [usersRes, raspRes, jogadasRes, inflRes, withRes, credRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('raspadinhas').select('*').order('created_at', { ascending: false }),
        supabase.from('jogadas').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('influencers').select('*').order('created_at', { ascending: false }),
        supabase.from('withdrawal_requests').select('*').order('requested_at', { ascending: false }),
        supabase.from('credit_purchases').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (raspRes.data) setRaspadinhas(raspRes.data);

      // influencers with emails
      if (inflRes.data) {
        const influencersWithEmails = await Promise.all(
          inflRes.data.map(async (influencer) => {
            const { data: prof } = await supabase
              .from('profiles')
              .select('email')
              .eq('user_id', influencer.user_id)
              .single();
            return {
              ...influencer,
              status: influencer.status || 'active',
              profiles: { email: prof?.email || 'Email não encontrado' },
            };
          }),
        );
        setInfluencers(influencersWithEmails as any);
      }

      // withdrawals with emails
      if (withRes.data) {
        const withdrawalsWithEmails = await Promise.all(
          withRes.data.map(async (wd) => {
            const { data: prof } = await supabase
              .from('profiles')
              .select('email')
              .eq('user_id', wd.user_id)
              .single();
            return { ...wd, profiles: { email: prof?.email || 'Email não encontrado' } };
          }),
        );
        setWithdrawals(withdrawalsWithEmails as any);
      }

      // credit purchases with emails
      if (credRes.data) {
        const creditsWithEmails = await Promise.all(
          credRes.data.map(async (c) => {
            const { data: prof } = await supabase
              .from('profiles')
              .select('email')
              .eq('user_id', c.user_id)
              .single();
            return { ...c, profiles: { email: prof?.email || 'Email não encontrado' } };
          }),
        );
        setCreditPurchases(creditsWithEmails as any);
      }

      // jogadas with profile/rasp
      if (jogadasRes.data) {
        const jogadasWithProfiles = await Promise.all(
          jogadasRes.data.map(async (jogada) => {
            const [profileRes, raspRes2] = await Promise.all([
              supabase.from('profiles').select('email').eq('user_id', jogada.user_id!).single(),
              supabase.from('raspadinhas').select('nome').eq('id', jogada.raspadinha_id!).single(),
            ]);
            return {
              ...jogada,
              profiles: { email: profileRes.data?.email || 'N/A' },
              raspadinhas: { nome: raspRes2.data?.nome || 'N/A' },
            };
          }),
        );
        setJogadas(jogadasWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erro ao carregar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  /** â€”â€”â€” CRUD raspadinhas â€”â€”â€” */
  const createRaspadinha = async () => {
    try {
      let imagemUrl = null;
      if (newRaspadinha.imagem) {
        const fileExt = newRaspadinha.imagem.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('raspadinhas')
          .upload(fileName, newRaspadinha.imagem);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('raspadinhas').getPublicUrl(fileName);
        imagemUrl = publicUrl;
      }

      const cashValueRaw = newRaspadinha.cash_payout || newRaspadinha.premio || '0';
      const cashPayoutValue = parseFloat(cashValueRaw);

      const { error } = await supabase.from('raspadinhas').insert({
        nome: newRaspadinha.nome,
        premio: parseFloat(newRaspadinha.premio),
        chances: parseFloat(newRaspadinha.chances) / 100,
        cash_payout: Number.isNaN(cashPayoutValue) ? 0 : cashPayoutValue,
        imagem_url: imagemUrl,
      });
      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Raspadinha criada.' });
      setNewRaspadinha({ nome: '', premio: '', chances: '', cash_payout: '', imagem: null });
      setShowNewRaspadinha(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao criar raspadinha:', error);
      toast({ title: 'Erro', description: 'Não foi possível criar.', variant: 'destructive' });
    }
  };

  const toggleRaspadinha = async (id: string, ativo: boolean) => {
    const { error } = await supabase.from('raspadinhas').update({ ativo: !ativo }).eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
    } else {
      fetchData();
    }
  };

  const deleteRaspadinha = async (id: string, nome: string) => {
    if (!confirm(`Excluir "${nome}"?`)) return;
    try {
      const { error } = await supabase.from('raspadinhas').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Excluída', description: 'Raspadinha removida.' });
      await fetchData();
    } catch (error) {
      console.error('Erro:', error);
      toast({ title: 'Erro', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const startEditRaspadinha = (raspadinha: Raspadinha) => {
    setEditingRaspadinha(raspadinha.id);
    setEditRaspadinha({
      nome: raspadinha.nome,
      premio: raspadinha.premio.toString(),
      chances: (raspadinha.chances * 100).toString(),
      cash_payout: raspadinha.cash_payout?.toString() ?? '',
    });
  };

  const cancelEditRaspadinha = () => {
    setEditingRaspadinha(null);
    setEditRaspadinha({ nome: '', premio: '', chances: '', cash_payout: '' });
  };

  const saveEditRaspadinha = async (id: string) => {
    try {
      const payoutValue = parseFloat(editRaspadinha.cash_payout || editRaspadinha.premio || '0');
      const { error } = await supabase
        .from('raspadinhas')
        .update({
          nome: editRaspadinha.nome,
          premio: parseFloat(editRaspadinha.premio),
          chances: parseFloat(editRaspadinha.chances) / 100,
          cash_payout: Number.isNaN(payoutValue) ? 0 : payoutValue,
        })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Atualizada', description: 'Raspadinha salva.' });
      setEditingRaspadinha(null);
      setEditRaspadinha({ nome: '', premio: '', chances: '', cash_payout: '' });
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar raspadinha:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    }
  };

  /** â€”â€”â€” Influencer â€”â€”â€” */
  const createInfluencer = async () => {
    if (creatingInfluencer) return;

    try {
      if (!newInfluencer.email) {
        toast({ title: 'Erro', description: 'Informe o e-mail do usuário.', variant: 'destructive' });
        return;
      }

      const commission = parseFloat(newInfluencer.commission_rate);
      if (Number.isNaN(commission) || commission < 0) {
        toast({ title: 'Erro', description: 'Informe uma comissão válida.', variant: 'destructive' });
        return;
      }

      if (newInfluencer.createNew && (!newInfluencer.password || newInfluencer.password.length < 6)) {
        toast({ title: 'Erro', description: 'Senha mínima 6 caracteres.', variant: 'destructive' });
        return;
      }

      let desiredCode = normalizeCode(newInfluencer.code);
      if (desiredCode && desiredCode.length < 3) {
        toast({ title: 'Erro', description: 'Código precisa ter ao menos 3 caracteres.', variant: 'destructive' });
        return;
      }

      if (desiredCode) {
        const available = await isCodeAvailable(desiredCode);
        if (!available) {
          toast({ title: 'Código em uso', description: 'Escolha outro código único.', variant: 'destructive' });
          return;
        }
      }

      const startingBalance = parseFloat(newInfluencer.starting_balance || '0');

      const payload: Record<string, unknown> = {
        mode: newInfluencer.createNew ? 'create_new' : 'attach_existing',
        email: newInfluencer.email.trim().toLowerCase(),
        commission_rate: commission,
        status: 'active',
      };

      if (newInfluencer.createNew) {
        payload.password = newInfluencer.password;
      }

      if (desiredCode) {
        payload.code = desiredCode;
      }

      if (!Number.isNaN(startingBalance) && startingBalance > 0) {
        payload.starting_balance = startingBalance;
      }

      setCreatingInfluencer(true);
      const { data: response, error } = await supabase.functions.invoke('admin-manage-influencer', {
        body: payload,
      });

      if (error) throw error;
      if (!response?.success) {
        throw new Error(response?.error || 'Não foi possível criar o influenciador');
      }

      const codeFromServer = response.data?.code || desiredCode;

      toast({
        title: 'Sucesso!',
        description: codeFromServer ? `Influenciador criado. Código: ${codeFromServer}` : 'Influenciador criado com sucesso.',
      });

      setNewInfluencer({ email: '', commission_rate: '10', password: '', createNew: false, code: '', starting_balance: '0' });
      setShowNewInfluencer(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao criar influenciador:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível criar.',
        variant: 'destructive',
      });
    } finally {
      setCreatingInfluencer(false);
    }
  };

  const normalizeCode = (code?: string) => (code ?? '').trim().replace(/\s+/g, '').toUpperCase();

  const isCodeAvailable = async (code: string, ignoreId?: string) => {
    let query = supabase.from('influencers').select('id').eq('code', code);
    if (ignoreId) {
      query = query.neq('id', ignoreId);
    }
    const { data, error } = await query.maybeSingle();
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return !data;
  };

  const generateUniqueCode = async (): Promise<string> => {
    const { data } = await supabase.rpc('generate_referral_code');
    const normalized = normalizeCode(data || '');
    if (!normalized) {
      return generateUniqueCode();
    }
    const available = await isCodeAvailable(normalized);
    if (!available) {
      return generateUniqueCode();
    }
    return normalized;
  };

  const createUserAccount = async () => {
    if (creatingUser) return;

    try {
      if (!newUser.email) {
        toast({ title: 'Erro', description: 'Informe o e-mail do usuário.', variant: 'destructive' });
        return;
      }

      if (!newUser.password || newUser.password.length < 6) {
        toast({ title: 'Erro', description: 'Senha mínima 6 caracteres.', variant: 'destructive' });
        return;
      }

      const startingBalanceNumber = parseFloat(newUser.starting_balance || '0');

      setCreatingUser(true);
      const { data: response, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUser.email.trim().toLowerCase(),
          password: newUser.password,
          role: newUser.role,
          starting_balance: Number.isNaN(startingBalanceNumber) ? 0 : startingBalanceNumber,
        },
      });

      if (error) throw error;
      if (!response?.success) {
        throw new Error(response?.error || 'Não foi possível criar o usuário');
      }

      toast({
        title: 'Usuário criado',
        description: `Conta ${response.data?.email || newUser.email} criada com sucesso.`,
      });

      setNewUser({ email: '', password: '', role: 'user', starting_balance: '0' });
      setShowNewUser(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível criar o usuário.',
        variant: 'destructive',
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const openEditInfluencer = (influencer: Influencer) => {
    setEditingInfluencer(influencer);
    setEditInfluencerForm({
      code: influencer.code,
      commission_rate: (influencer.commission_rate * 100).toString(),
      status: influencer.status || 'active',
    });
    setShowEditInfluencer(true);
  };

  const saveInfluencerChanges = async () => {
    if (!editingInfluencer) return;

    try {
      const commission = parseFloat(editInfluencerForm.commission_rate);
      if (Number.isNaN(commission) || commission < 0) {
        toast({ title: 'Erro', description: 'Informe uma comissão válida.', variant: 'destructive' });
        return;
      }

      const desiredCode = normalizeCode(editInfluencerForm.code);
      if (desiredCode.length < 3) {
        toast({ title: 'Erro', description: 'Código precisa ter ao menos 3 caracteres.', variant: 'destructive' });
        return;
      }

      const available = await isCodeAvailable(desiredCode, editingInfluencer.id);
      if (!available) {
        toast({ title: 'Código em uso', description: 'Escolha outro código único.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('influencers')
        .update({
          commission_rate: commission / 100,
          code: desiredCode,
          status: editInfluencerForm.status,
        })
        .eq('id', editingInfluencer.id);

      if (error) throw error;

      toast({ title: 'Salvo!', description: 'Dados do influenciador atualizados.' });
      setShowEditInfluencer(false);
      setEditingInfluencer(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar influenciador:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
    }
  };

  const toggleInfluencerStatus = async (influencer: Influencer) => {
    const nextStatus = influencer.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('influencers')
      .update({ status: nextStatus })
      .eq('id', influencer.id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível alterar o status.', variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado', description: `Influenciador ${nextStatus === 'active' ? 'ativado' : 'desativado'}.` });
      fetchData();
    }
  };

  const removeInfluencer = async (influencer: Influencer) => {
    const confirmed = confirm(`Remover ${influencer.profiles?.email} do programa de influenciadores?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('influencers').delete().eq('id', influencer.id);
      if (error) throw error;

      const { error: roleError } = await supabase.rpc('update_user_role', {
        target_user_id: influencer.user_id,
        new_role: 'user',
      });

      if (roleError) {
        console.error('Erro ao redefinir papel do usuário:', roleError);
        toast({
          title: 'Aviso',
          description: 'Influenciador removido, mas não foi possível atualizar o papel do usuário.',
        });
      } else {
        toast({ title: 'Influenciador removido', description: 'Usuário voltou para o perfil padrão.' });
      }

      fetchData();
    } catch (error) {
      console.error('Erro ao remover influenciador:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover.', variant: 'destructive' });
    }
  };

  const handleGenerateNewInfluencerCode = async () => {
    const code = await generateUniqueCode();
    setNewInfluencer((prev) => ({ ...prev, code }));
  };

  const handleGenerateEditInfluencerCode = async () => {
    const code = await generateUniqueCode();
    setEditInfluencerForm((prev) => ({ ...prev, code }));
  };

  const updateWithdrawalStatus = async (id: string, status: string, notes?: string) => {
    const updates: any = { status };
    if (status === 'processed') updates.processed_at = new Date().toISOString();
    if (notes) updates.admin_notes = notes;
    const { error } = await supabase.from('withdrawal_requests').update(updates).eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso!', description: 'Status atualizado.' });
      fetchData();
    }
  };

  const updateUserBalance = async (userId: string, amount: number) => {
    const { error } = await supabase.rpc('update_user_balance_secure', {
      user_uuid: userId,
      amount: amount,
      transaction_type: 'admin_adjustment',
      metadata: { admin_id: profile?.user_id, reason: 'manual_adjustment' },
    });
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar saldo.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso!', description: 'Saldo atualizado.' });
      fetchData();
    }
  };

  /** â€”â€”â€” Métricas derivadas â€”â€”â€” */
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeRasp = raspadinhas.filter(r => r.ativo).length;
    const pendingWd = withdrawals.filter(w => w.status === 'pending').length;
    const purchases = creditPurchases.length;
    return { totalUsers, activeRasp, pendingWd, purchases };
  }, [users, raspadinhas, withdrawals, creditPurchases]);

  const filteredRasp = useMemo(() => {
    if (!searchRasp) return raspadinhas;
    return raspadinhas.filter(r => r.nome.toLowerCase().includes(searchRasp.toLowerCase()));
  }, [raspadinhas, searchRasp]);

  const filteredUsers = useMemo(() => {
    if (!searchUser) return users;
    return users.filter(u => u.email?.toLowerCase().includes(searchUser.toLowerCase()));
  }, [users, searchUser]);

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
        <Card><CardContent className="p-8 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex w-full">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <SidebarInset className="flex-1">
          <NewNavbar />
          {/* Toolbar */}
          <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/70 bg-background/60 border-b border-border">
            <div className="h-14 flex items-center gap-2 px-4">
              <SidebarTrigger />
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold">Painel Administrativo</h1>
                  <p className="text-xs text-muted-foreground">Gestão de raspadinhas, usuários, saques e afiliados</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowNewRaspadinha(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nova Raspadinha
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowNewUser(true)} disabled={creatingUser}>
                    <UserPlus className="mr-2 h-4 w-4" /> Novo Usuário
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowNewInfluencer(true)} disabled={creatingInfluencer}>
                    <Megaphone className="mr-2 h-4 w-4" /> Novo Influenciador
                  </Button>
                  <Button size="sm" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Usuários" value={stats.totalUsers} />
                <StatCard icon={Gift} label="Raspadinhas ativas" value={stats.activeRasp} />
                <StatCard icon={Wallet} label="Saques pendentes" value={stats.pendingWd} />
                <StatCard icon={ShoppingBag} label="Compras recentes" value={stats.purchases} />
              </div>

              <Separator />

              {/* Tabs locais para melhor organização da view escolhida no sidebar */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="raspadinhas">Raspadinhas</TabsTrigger>
                  <TabsTrigger value="users">Usuários</TabsTrigger>
                  <TabsTrigger value="influencers">Influenciadores</TabsTrigger>
                  <TabsTrigger value="withdrawals">Saques</TabsTrigger>
                  <TabsTrigger value="purchases">Compras</TabsTrigger>
                  <TabsTrigger value="personalization">Personalização</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <AdminDashboard
                    users={users}
                    jogadas={jogadas}
                    influencers={influencers}
                    withdrawals={withdrawals}
                    creditPurchases={creditPurchases}
                  />
                </TabsContent>

                <TabsContent value="raspadinhas" className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <SectionHeader
                        title="Jogadas Recentes"
                        description="Últimas 20 jogadas registradas"
                      />
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {jogadas.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6">Sem jogadas por enquanto.</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Usuário</TableHead>
                              <TableHead>Raspadinha</TableHead>
                              <TableHead>Resultado</TableHead>
                              <TableHead>Prêmio</TableHead>
                              <TableHead>Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {jogadas.map((j) => (
                              <TableRow key={j.id}>
                                <TableCell>{j.profiles?.email}</TableCell>
                                <TableCell>{j.raspadinhas?.nome}</TableCell>
                                <TableCell>
                                  <Badge variant={j.resultado ? 'default' : 'secondary'}>
                                    {j.resultado ? 'Ganhou' : 'Perdeu'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{j.resultado ? `R$ ${j.premio_ganho?.toFixed(2)}` : '-'}</TableCell>
                                <TableCell>
                                  {new Date(j.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <SectionHeader
                        title="Raspadinhas"
                        description="Gerencie catálogo e status"
                      >
                        <div className="flex gap-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={searchRasp}
                              onChange={(e) => setSearchRasp(e.target.value)}
                              placeholder="Buscar por nome"
                              className="pl-8 w-56"
                            />
                          </div>
                          <Button variant="outline" onClick={() => setShowNewRaspadinha(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Nova
                          </Button>
                        </div>
                      </SectionHeader>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {filteredRasp.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6">Nenhuma raspadinha encontrada.</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Premio (exibicao)</TableHead>
                              <TableHead>Credito em saldo</TableHead>
                              <TableHead>Chances</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Acoes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRasp.map((rasp) => (
                              <TableRow key={rasp.id}>
                                <TableCell className="font-medium">
                                  {editingRaspadinha === rasp.id ? (
                                    <Input
                                      value={editRaspadinha.nome}
                                      onChange={(e) =>
                                        setEditRaspadinha({ ...editRaspadinha, nome: e.target.value })
                                      }
                                      className="w-full"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      {rasp.imagem_url && (
                                        <img
                                          src={rasp.imagem_url}
                                          alt={rasp.nome}
                                          className="h-8 w-8 rounded object-cover border"
                                        />
                                      )}
                                      {rasp.nome}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingRaspadinha === rasp.id ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editRaspadinha.premio}
                                      onChange={(e) =>
                                        setEditRaspadinha({ ...editRaspadinha, premio: e.target.value })
                                      }
                                      className="w-24"
                                    />
                                  ) : (
                                    `R$ ${rasp.premio.toFixed(2)}`
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingRaspadinha === rasp.id ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editRaspadinha.cash_payout}
                                      onChange={(e) =>
                                        setEditRaspadinha({ ...editRaspadinha, cash_payout: e.target.value })
                                      }
                                      className="w-24"
                                    />
                                  ) : (
                                    `R$ ${rasp.cash_payout.toFixed(2)}`
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingRaspadinha === rasp.id ? (
                                    <Input
                                      type="number"
                                      step="0.1"
                                      max="100"
                                      min="0"
                                      value={editRaspadinha.chances}
                                      onChange={(e) =>
                                        setEditRaspadinha({ ...editRaspadinha, chances: e.target.value })
                                      }
                                      className="w-20"
                                    />
                                  ) : (
                                    `${(rasp.chances * 100).toFixed(1)}%`
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={rasp.ativo ? 'default' : 'secondary'}>
                                    {rasp.ativo ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-2">
                                    {editingRaspadinha === rasp.id ? (
                                      <>
                                        <Button variant="default" size="sm" onClick={() => saveEditRaspadinha(rasp.id)}>
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={cancelEditRaspadinha}>
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button variant="outline" size="sm" onClick={() => startEditRaspadinha(rasp)}>
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => toggleRaspadinha(rasp.id, rasp.ativo)}
                                        >
                                          {rasp.ativo ? 'Desativar' : 'Ativar'}
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => deleteRaspadinha(rasp.id, rasp.nome)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="users">
                  <Card>
                    <CardHeader className="pb-3">
                      <SectionHeader title="Usuários" description="Lista de usuários registrados">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={searchUser}
                            onChange={(e) => setSearchUser(e.target.value)}
                            placeholder="Buscar por email"
                            className="pl-8 w-64"
                          />
                        </div>
                      </SectionHeader>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {filteredUsers.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6">Nenhum usuário encontrado.</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Saldo</TableHead>
                              <TableHead>Criação</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.email}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                                </TableCell>
                                <TableCell>R$ {user.saldo?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>{new Date(user.created_at).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const amount = prompt(
                                        'Valor para adicionar/remover (use valor negativo para remover):'
                                      );
                                      if (amount) updateUserBalance(user.user_id, parseFloat(amount));
                                    }}
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="influencers">
                  <Card>
                    <CardHeader>
                      <CardTitle>Influenciadores</CardTitle>
                      <CardDescription>Gerencie influenciadores e códigos de referência</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {influencers.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6">Nenhum influenciador cadastrado.</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Email</TableHead>
                              <TableHead>Código</TableHead>
                              <TableHead>Comissão</TableHead>
                              <TableHead>Referrals</TableHead>
                              <TableHead>Ganhos</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {influencers.map((influencer) => (
                              <TableRow key={influencer.id}>
                                <TableCell className="font-medium">{influencer.profiles?.email}</TableCell>
                                <TableCell>
                                  <code className="bg-muted px-2 py-1 rounded text-sm">{influencer.code}</code>
                                </TableCell>
                                <TableCell>{(influencer.commission_rate * 100).toFixed(1)}%</TableCell>
                                <TableCell>{influencer.total_referrals}</TableCell>
                                <TableCell>R$ {influencer.total_earnings?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>
                                  <Badge variant={influencer.status === 'active' ? 'default' : 'secondary'}>
                                    {influencer.status === 'active' ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const url = `${window.location.origin}/?ref=${influencer.code}`;
                                        navigator.clipboard.writeText(url);
                                        toast({ title: 'Link copiado!', description: 'Link de referência copiado' });
                                      }}
                                      title="Copiar link"
                                    >
                                      <LinkIcon className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openEditInfluencer(influencer)}
                                      title="Editar dados"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleInfluencerStatus(influencer)}
                                    >
                                      {influencer.status === 'active' ? 'Desativar' : 'Ativar'}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeInfluencer(influencer)}
                                      title="Remover influenciador"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="withdrawals">
                  <Card>
                    <CardHeader>
                      <CardTitle>Solicitações de Saque</CardTitle>
                      <CardDescription>Gerencie os saques pendentes</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {withdrawals.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6">Nenhuma solicitação no momento.</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Usuário</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Método</TableHead>
                              <TableHead>Chave PIX</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {withdrawals.map((w) => (
                              <TableRow key={w.id}>
                                <TableCell className="font-medium">{w.profiles?.email}</TableCell>
                                <TableCell>R$ {w.amount.toFixed(2)}</TableCell>
                                <TableCell>{w.payment_method}</TableCell>
                                <TableCell className="font-mono text-sm">{w.payment_details?.pix_key || 'N/A'}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      w.status === 'pending' ? 'destructive' :
                                        w.status === 'processed' ? 'default' : 'secondary'
                                    }
                                  >
                                    {w.status === 'pending' ? 'Pendente' :
                                      w.status === 'processed' ? 'Processado' : 'Rejeitado'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{new Date(w.requested_at).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>
                                  {w.status === 'pending' && (
                                    <div className="flex gap-1">
                                      <Button variant="default" size="sm" onClick={() => updateWithdrawalStatus(w.id, 'processed')}>
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                          const notes = prompt('Motivo da rejeição (opcional):');
                                          updateWithdrawalStatus(w.id, 'rejected', notes || undefined);
                                        }}
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="purchases">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Compras</CardTitle>
                      <CardDescription>Últimas 50 compras de créditos</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {creditPurchases.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6">Nenhuma compra encontrada.</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Usuário</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Método</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {creditPurchases.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.profiles?.email}</TableCell>
                                <TableCell>R$ {p.amount.toFixed(2)}</TableCell>
                                <TableCell>{p.method}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      p.status === 'completed' ? 'default' :
                                        p.status === 'pending' ? 'destructive' : 'secondary'
                                    }
                                  >
                                    {p.status === 'completed' ? 'Completo' :
                                      p.status === 'pending' ? 'Pendente' : 'Falhado'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{new Date(p.created_at).toLocaleDateString('pt-BR')}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="personalization">
                  <PersonalizationTab />
                </TabsContent>
              </Tabs>
            </div>
          </main>

          <Footer />
        </SidebarInset>
      </div>

      {/* â€”â€”â€” Dialog: Nova Raspadinha â€”â€”â€” */}
      <Dialog open={showNewRaspadinha} onOpenChange={setShowNewRaspadinha}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Nova Raspadinha</DialogTitle>
            <DialogDescription>Preencha os dados da nova raspadinha</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={newRaspadinha.nome}
                onChange={(e) => setNewRaspadinha({ ...newRaspadinha, nome: e.target.value })}
                placeholder="Nome da raspadinha"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="premio">Prêmio (R$)</Label>
                <Input
                  id="premio"
                  type="number"
                  step="0.01"
                  value={newRaspadinha.premio}
                  onChange={(e) => setNewRaspadinha({ ...newRaspadinha, premio: e.target.value })}
                  placeholder="100.00"
                />
              </div>
              <div>
                <Label htmlFor="chances">Chances (%)</Label>
                <Input
                  id="chances"
                  type="number"
                  step="0.1"
                  value={newRaspadinha.chances}
                  onChange={(e) => setNewRaspadinha({ ...newRaspadinha, chances: e.target.value })}
                  placeholder="10.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cashPayout">Credito em saldo (R$)</Label>
              <Input
                id="cashPayout"
                type="number"
                step="0.01"
                value={newRaspadinha.cash_payout}
                onChange={(e) => setNewRaspadinha({ ...newRaspadinha, cash_payout: e.target.value })}
                placeholder="Deixe em branco para usar o premio"
              />
              <p className="text-xs text-muted-foreground mt-1">Esse valor e creditado no saldo em vitorias. Use 0 para premios fisicos.</p>
            </div>
            <div>
              <Label htmlFor="imagem">Imagem (opcional)</Label>
              <Input
                id="imagem"
                type="file"
                accept="image/*"
                onChange={(e) => setNewRaspadinha({ ...newRaspadinha, imagem: e.target.files?.[0] || null })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewRaspadinha(false);
                  setNewRaspadinha({ nome: '', premio: '', chances: '', cash_payout: '', imagem: null });
                }}
              >
                Cancelar
              </Button>
              <Button onClick={createRaspadinha}>Criar Raspadinha</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showNewUser}
        onOpenChange={(open) => {
          setShowNewUser(open);
          if (!open) {
            setNewUser({ email: '', password: '', role: 'user', starting_balance: '0' });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Crie uma conta manualmente para acesso ao sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newUserEmail">Email</Label>
              <Input
                id="newUserEmail"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="usuario@email.com"
              />
            </div>
            <div>
              <Label htmlFor="newUserPassword">Senha</Label>
              <Input
                id="newUserPassword"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <Label htmlFor="newUserRole">Função</Label>
              <select
                id="newUserRole"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="user">Usuário comum</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Para criar influenciadores utilize o modal dedicado.</p>
            </div>
            <div>
              <Label htmlFor="newUserBalance">Saldo inicial (opcional)</Label>
              <Input
                id="newUserBalance"
                type="number"
                step="0.01"
                min="0"
                value={newUser.starting_balance}
                onChange={(e) => setNewUser({ ...newUser, starting_balance: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewUser(false);
                  setNewUser({ email: '', password: '', role: 'user', starting_balance: '0' });
                }}
                disabled={creatingUser}
              >
                Cancelar
              </Button>
              <Button onClick={createUserAccount} disabled={creatingUser}>
                {creatingUser ? 'Criando...' : 'Criar usuário'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* â€”â€”â€” Dialog: Novo Influenciador â€”â€”â€” */}
      <Dialog
        open={showNewInfluencer}
        onOpenChange={(open) => {
          setShowNewInfluencer(open);
          if (!open) {
            setNewInfluencer({ email: '', commission_rate: '10', password: '', createNew: false, code: '', starting_balance: '0' });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Influenciador</DialogTitle>
            <DialogDescription>Crie ou associe um usuário existente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createNew"
                checked={newInfluencer.createNew}
                onChange={(e) => setNewInfluencer({ ...newInfluencer, createNew: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="createNew">Criar novo usuário</Label>
            </div>
            <div>
              <Label htmlFor="email">{newInfluencer.createNew ? 'Email do novo usuário' : 'Email do usuário existente'}</Label>
              <Input
                id="email"
                type="email"
                value={newInfluencer.email}
                onChange={(e) => setNewInfluencer({ ...newInfluencer, email: e.target.value })}
                placeholder="usuario@email.com"
              />
            </div>
            {newInfluencer.createNew && (
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={newInfluencer.password}
                  onChange={(e) => setNewInfluencer({ ...newInfluencer, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            )}
            <div>
              <Label htmlFor="commission">Taxa de Comissão (%)</Label>
              <Input
                id="commission"
                type="number"
                step="0.1"
                min="0"
                value={newInfluencer.commission_rate}
                onChange={(e) => setNewInfluencer({ ...newInfluencer, commission_rate: e.target.value })}
                placeholder="10"
              />
            </div>
            <div>
              <Label htmlFor="influencerBalance">Saldo inicial (opcional)</Label>
              <Input
                id="influencerBalance"
                type="number"
                step="0.01"
                min="0"
                value={newInfluencer.starting_balance}
                onChange={(e) => setNewInfluencer({ ...newInfluencer, starting_balance: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="code">Código do influenciador</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={newInfluencer.code}
                  onChange={(e) =>
                    setNewInfluencer({
                      ...newInfluencer,
                      code: e.target.value.toUpperCase().replace(/\s+/g, ''),
                    })
                  }
                  placeholder="EXEMPLO123"
                />
                <Button type="button" variant="outline" onClick={handleGenerateNewInfluencerCode}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para gerar automaticamente.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewInfluencer(false);
                  setNewInfluencer({ email: '', commission_rate: '10', password: '', createNew: false, code: '', starting_balance: '0' });
                }}
                disabled={creatingInfluencer}
              >
                Cancelar
              </Button>
              <Button onClick={createInfluencer} disabled={creatingInfluencer}>
                {creatingInfluencer
                  ? 'Processando...'
                  : newInfluencer.createNew
                    ? 'Criar Usuário e Influenciador'
                    : 'Tornar Influenciador'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditInfluencer}
        onOpenChange={(open) => {
          setShowEditInfluencer(open);
          if (!open) {
            setEditingInfluencer(null);
            setEditInfluencerForm({ code: '', commission_rate: '10', status: 'active' });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Influenciador</DialogTitle>
            <DialogDescription>Personalize código, comissão e status.</DialogDescription>
          </DialogHeader>

          {editingInfluencer && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editEmail">E-mail</Label>
                <Input
                  id="editEmail"
                  value={editingInfluencer.profiles?.email ?? 'â€”'}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="editCommission">Taxa de Comissão (%)</Label>
                <Input
                  id="editCommission"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editInfluencerForm.commission_rate}
                  onChange={(e) =>
                    setEditInfluencerForm({ ...editInfluencerForm, commission_rate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editCode">Código do influenciador</Label>
                <div className="flex gap-2">
                  <Input
                    id="editCode"
                    value={editInfluencerForm.code}
                    onChange={(e) =>
                      setEditInfluencerForm({
                        ...editInfluencerForm,
                        code: e.target.value.toUpperCase().replace(/\s+/g, ''),
                      })
                    }
                  />
                  <Button type="button" variant="outline" onClick={handleGenerateEditInfluencerCode}>
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="editStatus">Status</Label>
                <select
                  id="editStatus"
                  value={editInfluencerForm.status}
                  onChange={(e) =>
                    setEditInfluencerForm({
                      ...editInfluencerForm,
                      status: e.target.value as Influencer['status'],
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditInfluencer(false);
                    setEditingInfluencer(null);
                    setEditInfluencerForm({ code: '', commission_rate: '10', status: 'active' });
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={saveInfluencerChanges}>Salvar alterações</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}





