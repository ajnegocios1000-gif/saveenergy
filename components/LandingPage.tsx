
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, ShieldCheck, TrendingDown, Leaf, Wallet, Cpu, Users, 
  MessageCircle, MessageSquare, ArrowRight, Volume2, VolumeX, ChevronLeft, ChevronRight,
  Rocket, CheckCircle2, LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../constants';
import { supabase } from '../lib/supabase';

const Carousel = () => {
  const [slides, setSlides] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetch('/api/banners').then(r => r.json()).then(data => {
      setSlides(data.filter((s: any) => s.active));
    });
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const currentSlide = slides[current];
    const timer = setTimeout(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, currentSlide.duration || 5000);
    return () => clearTimeout(timer);
  }, [current, slides]);

  useEffect(() => {
    if (videoRef.current && slides[current]?.type === 'video') {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
  }, [current, slides, isMuted]);

  if (slides.length === 0) return null;
  const currentSlide = slides[current];

  return (
    <div className="relative w-full aspect-video md:aspect-[21/9] bg-slate-900 overflow-hidden rounded-[3rem] shadow-2xl border-8 border-white group">
      {currentSlide.type === 'video' ? (
        <video key={currentSlide.id} ref={videoRef} src={currentSlide.url} className="w-full h-full object-cover" autoPlay playsInline />
      ) : (
        <img key={currentSlide.id} src={currentSlide.url} className="w-full h-full object-cover animate-fadeIn" alt="Banner" />
      )}
      {currentSlide.type === 'video' && (
        <div className="absolute bottom-8 left-8 flex items-center gap-4 z-20">
          <button onClick={() => setIsMuted(!isMuted)} className="p-4 bg-white/20 backdrop-blur-xl rounded-full text-white hover:bg-white/40 transition-all">
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
          <div className="h-1.5 w-32 bg-white/20 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${((current + 1) / slides.length) * 100}%` }} />
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setCurrent(prev => (prev - 1 + slides.length) % slides.length)} className="p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-emerald-500 transition-all"><ChevronLeft size={32} /></button>
        <button onClick={() => setCurrent(prev => (prev + 1) % slides.length)} className="p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-emerald-500 transition-all"><ChevronRight size={32} /></button>
      </div>
      <div className="absolute bottom-8 right-8 flex gap-2">
        {slides.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === current ? 'w-8 bg-emerald-500' : 'w-2 bg-white/30'}`} />
        ))}
      </div>
    </div>
  );
};

const Navbar = ({ logoUrl }: { logoUrl?: string }) => {
  const { user } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} className="h-10 object-contain" alt="Logo" />
          ) : (
            <div className="text-emerald-600"><Zap size={28} fill="currentColor" /></div>
          )}
          <span className="font-black text-2xl tracking-tighter uppercase italic text-slate-900">SAVE <span className="text-emerald-600">ENERGY</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[11px] font-black text-slate-500 uppercase tracking-widest">
          <a href="#about" className="hover:text-emerald-600 transition-colors">Sobre</a>
          <a href="#benefits" className="hover:text-emerald-600 transition-colors">Benefícios</a>
          <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">Como Funciona</a>
          <a href="#faq" className="hover:text-emerald-600 transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin(user?.email) && (
            <Link to="/admin" className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg">
              <LayoutDashboard size={14} /> PAINEL ADMIN
            </Link>
          )}
          {!user ? (
            <Link to="/login" className="text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-emerald-600 transition-colors">Entrar</Link>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <button onClick={() => supabase.auth.signOut()} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-500 transition-colors">Sair</button>
            </div>
          )}
          <Link to="/register" className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg active:scale-95 transition-all">Começar Agora</Link>
        </div>
      </div>
    </nav>
  );
};

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings);
  }, []);

  if (!settings) return null;

  return (
    <div className="bg-white min-h-screen text-slate-900 font-sans scroll-smooth">
      <Navbar logoUrl={settings.logoUrl} />
      <section className="relative pt-44 pb-32 px-6 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 space-y-10 z-10">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-emerald-600 text-white rounded-full shadow-xl">
                <Zap size={18} fill="currentColor" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Energia Solar Compartilhada</span>
              </div>
              <h1 className="text-6xl md:text-[5.5rem] font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
                {settings.heroTitle || 'Economize até 30% na sua conta de luz'}
              </h1>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl">
                {settings.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Link to="/register" className="w-full sm:w-auto px-12 py-6 bg-emerald-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-emerald-700 shadow-2xl flex items-center gap-3"><Rocket size={18} /> Cadastrar Agora</Link>
                <Link to="/chat" className="w-full sm:w-auto px-12 py-6 bg-white border-2 border-emerald-600 text-emerald-600 font-black uppercase text-xs tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-50 transition-all"><MessageSquare size={18} /> Tire suas Dúvidas</Link>
              </div>
            </div>
            <div className="flex-1 w-full relative">
              {settings.heroImageUrl && <img src={settings.heroImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-10 rounded-[3rem]" alt="Bg" />}
              <Carousel />
            </div>
          </div>
        </div>
      </section>
      <section id="benefits" className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">Por que escolher a SAVE ENERGY?</h2>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto italic">Transformamos sua forma de consumir energia com tecnologia e sustentabilidade.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <TrendingDown size={32} />, title: "Economia Real", desc: "Redução garantida de até 30% na sua conta de luz mensal sem pegadinhas." },
              { icon: <Wallet size={32} />, title: "Zero Investimento", desc: "Você não precisa comprar placas solares ou fazer obras. A economia é direta." },
              { icon: <ShieldCheck size={32} />, title: "100% Digital", desc: "Todo o processo é feito pelo celular. Sem burocracia ou papelada física." },
              { icon: <Leaf size={32} />, title: "Energia Limpa", desc: "Contribua para o meio ambiente utilizando energia de fontes renováveis." },
              { icon: <Cpu size={32} />, title: "Análise por IA", desc: "Nossa inteligência artificial Lexi analisa sua fatura e encontra o melhor plano." },
              { icon: <Users size={32} />, title: "Suporte VIP", desc: "Consultores especializados prontos para tirar todas as suas dúvidas." }
            ].map((benefit, i) => (
              <div key={i} className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 hover:border-emerald-500 transition-all group">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 mb-3">{benefit.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 space-y-8">
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-slate-900 leading-none">Como funciona o <span className="text-emerald-600">desconto?</span></h2>
              <div className="space-y-10">
                {[
                  { step: "01", title: "Envie sua Fatura", desc: "Tire uma foto ou envie o PDF da sua conta de luz atual." },
                  { step: "02", title: "Análise Lexi", desc: "Nossa IA processa os dados e calcula sua economia potencial em segundos." },
                  { step: "03", title: "Assinatura Digital", desc: "Você aceita a proposta e assina o contrato digitalmente, sem sair de casa." },
                  { step: "04", title: "Ativação", desc: "A distribuidora é notificada e você começa a receber os créditos de energia solar." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 items-start">
                    <span className="text-4xl font-black text-emerald-100 leading-none">{item.step}</span>
                    <div className="space-y-1">
                      <h4 className="text-lg font-black uppercase tracking-tight text-slate-800">{item.title}</h4>
                      <p className="text-slate-500 text-sm font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full"></div>
              <div className="relative z-10 space-y-8">
                <div className="bg-emerald-600/20 border border-emerald-500/30 p-6 rounded-2xl">
                  <p className="text-emerald-400 font-black text-xs uppercase tracking-widest mb-2">Simulação Realizada</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-3xl font-black tracking-tighter">R$ 450,00</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Conta Atual Média</p>
                    </div>
                    <ArrowRight className="text-slate-600" />
                    <div className="text-right">
                      <p className="text-3xl font-black tracking-tighter text-emerald-400">R$ 315,00</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Com Save Energy</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black uppercase tracking-tight">Pronto para economizar?</h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">Junte-se a milhares de brasileiros que já reduziram seus custos fixos e ajudam o planeta.</p>
                  <Link to="/register" className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20">Quero meu desconto agora</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-32 px-6 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#10b981,transparent)]"></div>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85]">Nossa Missão é <span className="text-emerald-500 italic">Democratizar</span> a Energia Solar</h2>
              <p className="text-lg text-slate-400 font-medium leading-relaxed">
                A SAVE ENERGY nasceu com o propósito de tornar a energia limpa acessível a todos os brasileiros, sem a necessidade de investimentos altos em infraestrutura própria. Através da energia solar compartilhada, conectamos usinas solares diretamente à sua rede elétrica.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-4xl font-black text-emerald-500 tracking-tighter">15k+</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Clientes Ativos</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-emerald-500 tracking-tighter">R$ 2M+</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Economizados</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img src={settings.about_image_1 || "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=600"} className="rounded-[2rem] w-full h-64 object-cover shadow-2xl" alt="Solar 1" />
              <img src={settings.about_image_2 || "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&q=80&w=600"} className="rounded-[2rem] w-full h-64 object-cover shadow-2xl mt-12" alt="Solar 2" />
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-32 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Dúvidas Frequentes</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Preciso fazer alguma obra em casa?", a: "Não! Você utiliza a mesma rede da sua distribuidora atual. A economia vem através de créditos de energia gerados em nossas usinas solares." },
              { q: "Existe custo de adesão ou cancelamento?", a: "Nenhum. Você não paga nada para entrar e pode cancelar quando quiser, respeitando apenas o aviso prévio de 90 dias." },
              { q: "Ainda vou receber conta da distribuidora?", a: "Sim, mas com um valor muito menor. Você receberá a conta da distribuidora com as taxas mínimas e a nossa fatura com o desconto aplicado." },
              { q: "O que acontece se acabar o sol?", a: "Nada muda. O sistema é compensado por créditos. Se houver falta de sol, a rede da distribuidora garante seu fornecimento normalmente." }
            ].map((item, i) => (
              <details key={i} className="group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer font-black uppercase text-xs tracking-widest text-slate-800 hover:bg-slate-50 transition-all">
                  {item.q}
                  <ChevronRight className="group-open:rotate-90 transition-transform text-emerald-600" />
                </summary>
                <div className="px-6 pb-6 text-slate-500 text-sm font-medium leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="pt-32 pb-12 px-6 bg-white border-t border-slate-100 text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="text-emerald-600" size={28} fill="currentColor" />
          <span className="font-black text-2xl uppercase italic text-slate-900">SAVE <span className="text-emerald-600">ENERGY</span></span>
        </div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">© 2026 SAVE ENERGY • TODOS OS DIREITOS RESERVADOS</p>
      </footer>

      <a 
        href={`https://wa.me/${settings.whatsapp || '5500000000000'}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-[100] bg-emerald-500 text-white p-4 rounded-full shadow-2xl hover:bg-emerald-600 hover:scale-110 transition-all active:scale-95 group"
      >
        <MessageCircle size={32} fill="currentColor" />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Fale com um consultor
        </span>
      </a>

      {isAdmin(user?.email) && (
        <Link 
          to="/admin" 
          className="fixed bottom-8 left-8 z-[100] bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-blue-600 hover:scale-110 transition-all active:scale-95 group flex items-center gap-3"
        >
          <LayoutDashboard size={32} />
          <span className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-white text-slate-900 border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
            Retornar ao Admin
          </span>
        </Link>
      )}
    </div>
  );
};

export default LandingPage;
