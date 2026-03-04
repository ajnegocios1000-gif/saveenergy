
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import ChatInterface from './components/ChatInterface';
import RegistrationForm from './components/RegistrationForm';
import ResetPassword from './components/ResetPassword';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

const MASTER_EMAIL = 'pereira.itapema@gmail.com';

const AuthGate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [internalLoading, setInternalLoading] = useState(true);

  useEffect(() => {
    // Monitoramento agressivo de sessão
    const checkRedirection = (sessionUser: any) => {
      const isMaster = sessionUser?.email === MASTER_EMAIL;
      const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
      
      if (isMaster && isAuthPage) {
        console.log("Log: Admin Master detectado, redirecionando para /admin");
        navigate('/admin', { replace: true });
      }
      setInternalLoading(false);
    };

    // Checagem inicial
    if (!loading) {
      checkRedirection(user);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      console.log(`Log: Evento Auth [${event}] para: ${session?.user?.email || 'Visitante'}`);
      checkRedirection(session?.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname, loading, user]);

  // Tela de bloqueio azul SAVE ENERGY obrigatória
  if (loading || internalLoading) {
    return (
      <div className="fixed inset-0 bg-emerald-600 z-[9999] flex flex-col items-center justify-center text-white px-6 text-center">
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
          <Loader2 className="animate-spin text-white relative" size={72} strokeWidth={2.5} />
        </div>
        <div className="space-y-4 max-w-sm">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-[0.2em] animate-pulse leading-tight">
            SAVE ENERGY: <br/>Autenticando...
          </h2>
          <div className="flex flex-col gap-2 items-center">
            <p className="text-[10px] font-black text-emerald-200 uppercase tracking-[0.4em]">Protocolo de Segurança Ativo</p>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-white animate-[loading_2s_ease-in-out_infinite] w-[40%]"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthGate />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/register" element={<RegistrationForm />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
