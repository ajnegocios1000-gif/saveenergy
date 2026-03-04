
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, ShieldCheck, Mail, Lock, Loader2, ArrowLeft, Chrome, AlertCircle } from 'lucide-react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isAdmin } from '../constants';

const Login: React.FC = () => {
  const { user, loading, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Redireciona se já estiver logado (Backup do AuthGate)
  useEffect(() => {
    if (!loading && isAdmin(user?.email)) {
      navigate('/admin', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (isAdmin(data.user?.email)) {
        navigate('/admin', { replace: true });
      } else {
        await supabase.auth.signOut();
        setError('Acesso negado: Este e-mail não é o administrador master.');
      }
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.message?.includes("provider is not enabled")) {
        setError("Erro: O login via Google não está ativado no painel do Supabase.");
      } else {
        setError("Falha ao conectar com o Google. Tente login manual.");
      }
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl border border-slate-800/10 p-10 md:p-12 text-center space-y-8 animate-fadeIn">
        <div className="flex justify-center">
          <div className="bg-blue-600 p-5 rounded-[2rem] text-white shadow-2xl shadow-blue-600/30">
            <ShieldCheck size={48} />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">ECO<span className="text-blue-600">AGENTE</span></h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Painel Master de Segurança</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-sm active:scale-95"
          >
            <Chrome size={20} className="text-blue-600" /> Entrar com Google
          </button>
          
          <div className="flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-slate-100"></div>
            <span className="text-[8px] font-black text-slate-300 uppercase">OU ACESSO MANUAL</span>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:border-blue-600 transition-all outline-none shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:border-blue-600 transition-all outline-none shadow-inner"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase border border-red-100 flex items-center gap-3">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <button 
              type="submit" disabled={isLoggingIn}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
            >
              {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : 'Autenticar no Sistema'}
            </button>
          </form>
        </div>

        <Link to="/" className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
          <ArrowLeft size={14} /> Cancelar e Voltar
        </Link>
      </div>
    </div>
  );
};

export default Login;
