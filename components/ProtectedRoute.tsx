
import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert, Key, ArrowLeft } from 'lucide-react';

const MASTER_EMAIL = 'pereira.itapema@gmail.com';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // 1. Aguarda carregamento do AuthContext
  if (loading) {
    return (
      <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center text-white p-8">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-black uppercase tracking-widest text-xs">Validando Credenciais Master...</p>
      </div>
    );
  }

  // 2. Se não houver usuário ou não for o master
  if (!user || user.email !== MASTER_EMAIL) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-12 text-center space-y-8 animate-fadeIn">
          <div className="flex justify-center">
            <div className="bg-red-50 p-6 rounded-[2rem] text-red-500 shadow-inner">
              <ShieldAlert size={64} strokeWidth={2.5} />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic leading-none">Acesso <span className="text-red-600">Restrito</span></h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              {user 
                ? `O e-mail ${user.email} não possui privilégios de administrador.` 
                : 'Nenhuma sessão administrativa encontrada no navegador.'}
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-4">
            <Link 
              to="/login" 
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
            >
              <Key size={20} /> FAZER LOGIN MASTER
            </Link>
            
            <Link 
              to="/" 
              className="w-full py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={14} /> Voltar para o Site
            </Link>
          </div>
          
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] pt-4">ECOAGENTE SECURITY • 403 FORBIDDEN</p>
        </div>
      </div>
    );
  }

  // 3. Sucesso absoluto: Renderiza o Admin
  return <>{children}</>;
};

export default ProtectedRoute;
