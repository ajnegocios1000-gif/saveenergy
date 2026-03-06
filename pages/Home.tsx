
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, ShieldCheck, TrendingDown, Leaf, Wallet, Cpu, Users, 
  MessageCircle, MessageSquare, ArrowRight, Volume2, VolumeX, ChevronLeft, ChevronRight,
  Rocket, CheckCircle2, LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { isAdmin } from '../constants';

const Carousel = () => {
  const [slides, setSlides] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [isMuted, setIsMuted] = useState(false); // Inicia desmutado conforme solicitado (pode ser bloqueado pelo browser)
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/banners').then(r => r.json()).then(data => {
      setSlides(data.filter((s: any) => s.active));
    });
  }, []);

  const nextSlide = () => {
    setCurrent(prev => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrent(prev => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (slides.length === 0) return;
    
    const currentSlide = slides[current];
    
    // Se for vídeo, não usamos timer fixo, esperamos o vídeo acabar via onEnded
    if (currentSlide.type === 'video') {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Se for foto, respeita o tempo de duração (padrão 5s)
    const duration = currentSlide.duration || 5000;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(nextSlide, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, slides]);

  useEffect(() => {
    if (videoRef.current && slides[current]?.type === 'video') {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(e => {
        console.warn('Autoplay com áudio bloqueado, tentando mutado:', e);
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play();
        }
      });
    }
  }, [current, slides, isMuted]);

  if (slides.length === 0) return (
    <div className="w-full aspect-video bg-slate-900 rounded-[3rem] animate-pulse flex items-center justify-center">
       <Zap size={48} className="text-slate-700" />
    </div>
  );

  const currentSlide = slides[current];

  return (
    <div className="relative w-full aspect-video md:aspect-[21/9] bg-black overflow-hidden rounded-[3rem] shadow-2xl border-8 border-white group">
      {currentSlide.type === 'video' ? (
        <video 
          key={currentSlide.id} 
          ref={videoRef} 
          src={currentSlide.url} 
          className="w-full h-full object-contain" // Mostrar vídeo inteiro
          autoPlay 
          playsInline 
          muted={isMuted}
          onEnded={nextSlide} // Terminou começa o outro imediatamente
        />
      ) : (
        <img 
          key={currentSlide.id} 
          src={currentSlide.url} 
          className="w-full h-full object-cover animate-fadeIn" 
          alt="Banner" 
        />
      )}
      
      {currentSlide.type === 'video' && (
        <div className="absolute bottom-8 left-8 flex items-center gap-4 z-20">
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className="p-4 bg-white/20 backdrop-blur-xl rounded-full text-white hover:bg-white/40 transition-all shadow-xl"
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
          <div className="h-1.5 w-32 bg-white/20 rounded-full overflow-hidden">
             <div 
               className="h-full bg-emerald-500 transition-all duration-300" 
               style={{ width: `${((current + 1) / slides.length) * 100}%` }} 
             />
          </div>
        </div>
      )}
      
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 opacity-0 group-hover:opacity-100 transition-all z-30">
        <button 
          onClick={prevSlide} 
          className="p-4 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-emerald-500 transition-all active:scale-90"
        >
          <ChevronLeft size={32} />
        </button>
        <button 
          onClick={nextSlide} 
          className="p-4 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-emerald-500 transition-all active:scale-90"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      <div className="absolute bottom-8 right-8 flex gap-2 z-30">
        {slides.map((_, i) => (
          <button 
            key={i} 
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? 'w-8 bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'w-2 bg-white/30'}`} 
          />
        ))}
      </div>
    </div>
  );
};

const AnimatedCTA = ({ to, children, className = "", icon: Icon }: any) => (
  <Link 
    to={to} 
    className={`group relative overflow-hidden px-12 py-6 bg-emerald-600 text-white font-black uppercase text-sm tracking-widest rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer" />
    <span className="relative z-10 flex items-center gap-3">
      {Icon && <Icon size={20} className="animate-bounce" />}
      {children}
    </span>
  </Link>
);

const Home: React.FC = () => {
  const [content, setContent] = useState<any>(null);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [activePopup, setActivePopup] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    supabase.from('site_content').select('*').maybeSingle().then(({ data }: { data: any }) => setContent(data));
    fetch('/api/social-links').then(r => r.json()).then(setSocialLinks);
    fetch('/api/terms').then(r => r.json()).then(setTerms);
  }, []);

  return (
    <div className="bg-white min-h-screen text-slate-900 font-sans scroll-smooth">
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {content?.logo_url ? <img src={content.logo_url} className="h-10 object-contain" alt="Logo" /> : (
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

      <section className="relative pt-44 pb-32 px-6 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 space-y-10 z-10">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-emerald-600 text-white rounded-full shadow-xl">
                <Zap size={18} fill="currentColor" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Energia Solar Compartilhada</span>
              </div>
              <h1 className="text-6xl md:text-[5.5rem] font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
                {content?.hero_title || 'Economize até 30% na sua conta de luz'}
              </h1>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl">
                {content?.hero_subtitle || 'Conectamos você às melhores soluções de energia solar compartilhada do Brasil.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <AnimatedCTA to="/register" icon={Rocket}>Cadastrar Agora</AnimatedCTA>
                {content?.show_specialist_btn !== false && (
                  <Link to="/chat" className="w-full sm:w-auto px-12 py-6 bg-white border-2 border-emerald-600 text-emerald-600 font-black uppercase text-xs tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-50 transition-all"><MessageSquare size={18} /> Tire suas Dúvidas</Link>
                )}
              </div>
              
              {/* Gatilhos de Conversão */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10">
                <Link to="/register" className="p-4 bg-slate-100 rounded-xl text-center font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all">Economia Garantida</Link>
                <Link to="/register" className="p-4 bg-slate-100 rounded-xl text-center font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all">Não perca tempo</Link>
                <Link to="/register" className="p-4 bg-slate-900 text-white rounded-xl text-center font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all">Paga caro porque quer</Link>
              </div>
            </div>
            <div className="flex-1 w-full relative">
              {content?.hero_image_url && <img src={content.hero_image_url} className="absolute inset-0 w-full h-full object-cover opacity-10 rounded-[3rem] blur-sm scale-105" alt="Bg" />}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
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
          <div className="flex justify-center">
            <AnimatedCTA to="/register" icon={TrendingDown}>Começar a Economizar Agora</AnimatedCTA>
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
                  <AnimatedCTA to="/register" className="w-full sm:w-auto" icon={Zap}>Quero meu desconto agora</AnimatedCTA>
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
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-4xl font-black text-emerald-500 tracking-tighter">15k+</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Clientes Ativos</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-emerald-500 tracking-tighter">R$ 2M+</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Economizados</p>
                </div>
              </div>
              <AnimatedCTA to="/register" className="bg-[#FFDF00] text-slate-900 hover:bg-[#FFD700]" icon={Rocket}>Fazer parte da revolução</AnimatedCTA>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img src={content?.about_image_1 || "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=600"} className="rounded-[2rem] w-full h-64 object-cover shadow-2xl" alt="Solar 1" />
              <img src={content?.about_image_2 || "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&q=80&w=600"} className="rounded-[2rem] w-full h-64 object-cover shadow-2xl mt-12" alt="Solar 2" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-emerald-600 text-center flex flex-col items-center">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-8">Pronto para economizar?</h2>
        <AnimatedCTA to="/chat" className="bg-white text-emerald-600 hover:bg-slate-100" icon={MessageSquare}>Falar com um Especialista</AnimatedCTA>
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

      <section id="testimonials" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">Quem já economiza com a SAVE ENERGY</h2>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto italic">Veja o que nossos clientes estão dizendo sobre a economia garantida.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: "Ana Silva", city: "São Paulo", text: "Economia real logo na primeira fatura! Incrível, finalmente algo que funciona de verdade.", photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200" },
              { name: "Carlos Mendes", city: "Curitiba", text: "Sem obras, sem dor de cabeça. A Save Energy resolveu tudo em minutos. Recomendo demais!", photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200" },
              { name: "Beatriz Souza", city: "Recife", text: "Finalmente uma solução sustentável que cabe no bolso. Minha conta caiu muito!", photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=200" },
              { name: "Ricardo Oliveira", city: "Belo Horizonte", text: "Atendimento nota 10 e desconto garantido. Processo super transparente.", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200" },
              { name: "Fernanda Lima", city: "Porto Alegre", text: "A Lexi me ajudou em tudo. Processo super simples e sem burocracia.", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200" },
              { name: "João Santos", city: "Salvador", text: "Minha conta caiu quase 20%. Muito feliz com a economia mensal!", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200" },
              { name: "Mariana Costa", city: "Fortaleza", text: "A melhor decisão que tomei este ano. Economia garantida sem investimento.", photo: "https://images.unsplash.com/photo-1594493301539-780006769f37?auto=format&fit=crop&q=80&w=200" },
              { name: "Pedro Rocha", city: "Manaus", text: "Rápido, fácil e transparente. A Save Energy é sensacional!", photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200" },
              { name: "Camila Dias", city: "Goiânia", text: "A Save Energy mudou minha forma de ver a conta de luz. Tudo muito claro.", photo: "https://images.unsplash.com/photo-1581579186913-45ac3e6efe93?auto=format&fit=crop&q=80&w=200" },
              { name: "Lucas Ferreira", city: "Vitória", text: "Sem investimento inicial e economia todo mês. Perfeito para quem quer economizar.", photo: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=200" }
            ].map((t, i) => (
              <div key={i} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <img src={t.photo} className="w-14 h-14 rounded-full object-cover" alt={t.name} referrerPolicy="no-referrer" />
                  <div>
                    <p className="font-black text-slate-800 uppercase text-sm tracking-tight">{t.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{t.city}</p>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed italic">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="specialist-cta" className="py-20 px-6 bg-slate-50 text-center flex flex-col items-center">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-8">Ainda com dúvidas?</h2>
        <AnimatedCTA to="/chat" className="bg-[#FFDF00] text-slate-900 hover:bg-[#FFD700]" icon={MessageSquare}>Falar com um Especialista</AnimatedCTA>
      </section>

      <footer className="pt-32 pb-12 px-6 bg-white border-t border-slate-100 text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="text-emerald-600" size={28} fill="currentColor" />
          <span className="font-black text-2xl uppercase italic text-slate-900">SAVE <span className="text-emerald-600">ENERGY</span></span>
        </div>
        
        <div className="flex justify-center gap-6 mb-8">
          {socialLinks.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-600 transition-colors">
              {link.platform}
            </a>
          ))}
        </div>

        <div className="flex justify-center gap-6 mb-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
          {terms.map((term, i) => (
            <button key={i} onClick={() => setActivePopup(term)} className="hover:text-emerald-600">{term.title}</button>
          ))}
        </div>

        {activePopup && (
          <div className="fixed inset-0 z-[200] bg-slate-900/50 flex items-center justify-center p-6" onClick={() => setActivePopup(null)}>
            <div className="bg-white p-10 rounded-[2rem] max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-black text-2xl uppercase tracking-tighter mb-4">{activePopup.title}</h3>
              <p className="text-slate-600 leading-relaxed">{activePopup.content}</p>
              <button onClick={() => setActivePopup(null)} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Fechar</button>
            </div>
          </div>
        )}

        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">© 2026 SAVE ENERGY • TODOS OS DIREITOS RESERVADOS</p>
      </footer>

      {content?.show_whatsapp !== false && (
        <a 
          href={`https://wa.me/${content?.whatsapp || '5500000000000'}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-8 right-8 z-[100] bg-emerald-500 text-white p-4 rounded-full shadow-2xl hover:bg-emerald-600 hover:scale-110 transition-all active:scale-95 group"
        >
          <MessageCircle size={32} fill="currentColor" />
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Fale com um consultor
          </span>
        </a>
      )}

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

export default Home;
