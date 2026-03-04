
// components/ResetPassword.tsx - Security-first password reset interface
import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if the user is redirected with an access token (Supabase Auth reset flow)
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsSessionActive(!!session);
      } catch (err) {
        setIsSessionActive(false);
      }
    };
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      return setError('A senha deve conter pelo menos 8 caracteres para sua segurança.');
    }

    if (newPassword !== confirmPassword) {
      return setError('As senhas digitadas são diferentes. Verifique e tente novamente.');
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao atualizar sua senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking session
  if (isSessionActive === null) {
    return (
      <div className="max-w-md mx-auto mt-20 p-10 space-y-8 animate-pulse">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-slate-200 rounded-2xl"></div>
          <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-64 bg-slate-100 rounded-lg"></div>
        </div>
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-6">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-100 rounded"></div>
            <div className="h-14 w-full bg-slate-50 rounded-2xl"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-100 rounded"></div>
            <div className="h-14 w-full bg-slate-50 rounded-2xl"></div>
          </div>
          <div className="h-14 w-full bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (isSessionActive === false) {
    return (
      <div className="max-w-md mx-auto p-12 bg-white rounded-3xl shadow-xl border border-red-100 text-center space-y-6 animate-fadeIn mt-20">
        <AlertCircle className="mx-auto text-red-500" size={56} />
        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Acesso Expirado</h2>
        <p className="text-slate-500 leading-relaxed">Sua sessão de recuperação de senha expirou ou o link é inválido. Solicite um novo reset por e-mail.</p>
        <button onClick={() => window.location.href = '/'} className="w-full py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl">Voltar ao Início</button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto p-12 bg-white rounded-3xl shadow-2xl border border-slate-100 text-center space-y-6 animate-fadeIn mt-20">
        <CheckCircle2 className="mx-auto text-green-600" size={64} />
        <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Senha Atualizada!</h2>
        <p className="text-slate-500 leading-relaxed">Sua nova senha foi salva com sucesso no sistema SAVE ENERGY.</p>
        {/* Fix: Redirect to /login after success as requested in requirements */}
        <button onClick={() => window.location.href = '/login'} className="w-full py-4 bg-green-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-green-600/20 hover:bg-green-700 transition-all">Acessar Plataforma</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-2xl mb-4 shadow-xl shadow-green-600/20">
          <Zap size={32} fill="currentColor" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Definir Nova Senha</h2>
        <p className="text-slate-500 text-sm font-medium mt-2">Segurança avançada para sua conta SAVE ENERGY</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-50 space-y-6 animate-fadeIn">
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nova Senha (mín. 8 caracteres)</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-4 text-slate-300 group-focus-within:text-green-600 transition-colors" size={20} />
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Digite aqui..."
              className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 font-bold transition-all" 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Confirmar Nova Senha</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-4 text-slate-300 group-focus-within:text-green-600 transition-colors" size={20} />
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Repita a senha..."
              className="w-full pl-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 font-bold transition-all" 
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-3 border border-red-100 font-black uppercase tracking-tight">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full py-5 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.3em] rounded-2xl hover:bg-slate-800 shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <>Salvar Nova Senha <Zap size={16} fill="currentColor" /></>}
        </button>
      </form>
      <p className="text-center text-[9px] text-slate-400 mt-8 font-bold uppercase tracking-widest leading-relaxed">Proteção via Supabase Auth & SAVE ENERGY Shield</p>
    </div>
  );
};

export default ResetPassword;
