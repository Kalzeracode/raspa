import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewNavbar } from "@/components/NewNavbar";
import { Footer } from "@/components/Footer";
import { AtSign, Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type TabValue = "login" | "signup";

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trailing?: React.ReactNode;
}

function AuthField({ id, label, icon: Icon, trailing, className, ...props }: AuthFieldProps) {
  const hasTrailing = Boolean(trailing);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-slate-200">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={id}
          {...props}
          className={cn(
            "h-12 w-full rounded-xl border border-[#1f2c3e] bg-[#101a2b] pl-11",
            hasTrailing ? "pr-12" : "pr-4",
            "text-sm text-white placeholder:text-slate-500 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
            className
          )}
        />
        {hasTrailing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");

  const [activeTab, setActiveTab] = useState<TabValue>(referralCode ? "signup" : "login");
  const [loginData, setLoginData] = useState({ email: "", password: "", remember: false });
  const [signupData, setSignupData] = useState({ email: "", password: "", confirmPassword: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(loginData.email, loginData.password);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      return;
    }
    await signUp(signupData.email, signupData.password, referralCode || undefined);
  };

  const passwordMismatch =
    signupData.password !== signupData.confirmPassword && signupData.confirmPassword.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050b16] via-[#081224] to-[#050b16] text-white">
      <NewNavbar />
      <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-lg">
          <Card className="border border-white/10 bg-[#0d1626]/95 shadow-[0_25px_70px_rgba(5,12,24,0.55)] backdrop-blur-xl rounded-[28px]">
            <CardHeader className="space-y-4 pb-0 text-center px-6 sm:px-10">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 6" }}>
                  <img
                    src="https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/site-assets/assets/carousel_1-1757813891697.png"
                    alt="Raspadinha premiada"
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1626] via-transparent to-transparent" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl sm:text-3xl font-semibold text-white">
                  {activeTab === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-slate-400">
                  {referralCode
                    ? `Cadastre-se com o codigo especial ${referralCode} e aproveite as vantagens.`
                    : activeTab === "login"
                    ? "Entre com seus dados para continuar jogando."
                    : "Preencha os dados abaixo para comecar a jogar agora mesmo."}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6 px-6 pb-8 sm:px-10">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 rounded-full bg-[#111c2d] p-1 text-xs sm:text-sm">
                  <TabsTrigger
                    value="login"
                    className="rounded-full text-xs sm:text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-slate-400"
                  >
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-full text-xs sm:text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-slate-400"
                  >
                    Cadastrar
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-5">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <AuthField
                      id="login-email"
                      label="Usuario (e-mail)"
                      icon={AtSign}
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      autoComplete="email"
                      required
                    />

                    <AuthField
                      id="login-password"
                      label="Senha"
                      icon={Lock}
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="********"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      autoComplete="current-password"
                      required
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((prev) => !prev)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={loginData.remember}
                          onChange={(e) => setLoginData({ ...loginData, remember: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-500 bg-transparent text-primary focus:ring-primary"
                        />
                        Lembrar de mim
                      </label>
                      <button
                        type="button"
                        className="font-medium text-slate-300 transition hover:text-white"
                      >
                        Esqueci a senha
                      </button>
                    </div>

                    <Button type="submit" className="h-12 w-full rounded-xl bg-primary/90 font-semibold text-white transition hover:bg-primary">
                      Entrar
                    </Button>

                    <p className="text-center text-sm text-slate-400">
                      Nao tem conta? {" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("signup")}
                        className="font-semibold text-primary transition hover:text-primary/80"
                      >
                        Cadastre-se
                      </button>
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-5">
                  <form onSubmit={handleSignup} className="space-y-5">
                    <AuthField
                      id="signup-email"
                      label="E-mail"
                      icon={AtSign}
                      type="email"
                      placeholder="seu@email.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      autoComplete="email"
                      required
                    />

                    <AuthField
                      id="signup-password"
                      label="Criar senha"
                      icon={Lock}
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="********"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      autoComplete="new-password"
                      required
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword((prev) => !prev)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />

                    <AuthField
                      id="confirm-password"
                      label="Confirmar senha"
                      icon={Lock}
                      type={showSignupConfirmPassword ? "text" : "password"}
                      placeholder="********"
                      value={signupData.confirmPassword}
                      onChange={(e) =>
                        setSignupData({ ...signupData, confirmPassword: e.target.value })
                      }
                      autoComplete="new-password"
                      required
                      className={passwordMismatch ? "border-destructive/70" : undefined}
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowSignupConfirmPassword((prev) => !prev)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {showSignupConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />

                    {passwordMismatch && (
                      <p className="text-sm font-medium text-destructive">
                        As senhas nao coincidem.
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-xl bg-primary/90 font-semibold text-white transition hover:bg-primary"
                      disabled={passwordMismatch}
                    >
                      Cadastrar-se
                    </Button>

                    <p className="text-center text-sm text-slate-400">
                      Ja tem uma conta? {" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("login")}
                        className="font-semibold text-primary transition hover:text-primary/80"
                      >
                        Entrar
                      </button>
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}














