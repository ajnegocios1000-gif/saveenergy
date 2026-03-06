
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Image as ImageIcon, CheckCircle, Trash2, Plus, LogOut, 
  Zap, Home, AlertCircle, Loader2, Key, RefreshCw, 
  Settings, Save, Play, Eye, EyeOff, Edit3, Upload, Film,
  LayoutDashboard, Globe, FileImage, Layout, Check, Info, ArrowLeft, LayoutGrid,
  Copy, Download, Filter, Calendar, DollarSign, CheckCircle2, Search, X, BrainCircuit
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { isAdmin, ADMIN_EMAILS } from '../constants';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1509391366360-fe5bb584850a?auto=format&fit=crop&q=80&w=1200';

const Tooltip: React.FC<{ text: string; children: React.ReactNode; position?: 'top' | 'bottom' | 'right' | 'left' }> = ({ text, children, position = 'top' }) => {
  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2'
  };

  return (
    <div className="relative group flex items-center">
      {children}
      <div className={`absolute ${posClasses[position]} hidden group-hover:block z-[100] px-3 py-2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-2xl whitespace-nowrap pointer-events-none border border-slate-700 animate-fadeIn`}>
        {text}
        <div className={`absolute w-2 h-2 bg-slate-800 border-slate-700 transform rotate-45 ${
          position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b' :
          position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-l border-t' :
          position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2 border-l border-b' :
          'right-[-4px] top-1/2 -translate-y-1/2 border-r border-t'
        }`} />
      </div>
    </div>
  );
};

const AdminPanel: React.FC = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    status: 'new',
    dateStart: '',
    dateEnd: '',
    minValue: '',
    minCommission: '',
    search: ''
  });

  const [banners, setBanners] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [siteContent, setSiteContent] = useState<any>({
    logo_url: '',
    hero_image_url: PLACEHOLDER_IMG,
    about_image_1: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=600',
    about_image_2: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&q=80&w=600',
    hero_title: 'Economize até 30% na sua conta de luz',
    hero_subtitle: 'Energia solar compartilhada sem investimento.',
    whatsapp: '5500000000000',
    show_whatsapp: true,
    show_specialist_btn: true,
    ai_rules: 'Você é um consultor de elite da SAVE ENERGY. Seu objetivo é converter leads. Regras: 1. Sempre foque na economia garantida e na ausência de riscos (sem obras, sem investimento). 2. Se o cliente hesitar, use o gatilho: "Você continua pagando caro na conta de luz porque quer, pois a solução digital e sem custo já está disponível". 3. Enfatize: "Sem despesas, sem prejuízo, só benefícios". 4. Sempre direcione para o cadastro da fatura para análise imediata.',
    ai_memory: 'A SAVE ENERGY oferece energia solar compartilhada. Como funciona: O cliente assina uma cota de uma usina solar remota, não precisa de placas no telhado, não tem obras. Vantagens: Desconto de até 30% na conta, 100% digital, sem fidelidade abusiva, sustentabilidade. Dúvidas comuns: "Preciso furar o telhado?" -> Não. "Tem custo de instalação?" -> Não. "É seguro?" -> Sim, regulamentado pela ANEEL.'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [newKey, setNewKey] = useState({ provider: '', key_value: '' });
  
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [testingKeys, setTestingKeys] = useState<Record<string, boolean>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  const navigate = useNavigate();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const about1InputRef = useRef<HTMLInputElement>(null);
  const about2InputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !isAdmin(user.email)) navigate('/');
    fetchData();
  }, [user, activeTab]);

  useEffect(() => {
    applyFilters();
  }, [leads, filters]);

  const applyFilters = () => {
    let result = [...leads];

    if (filters.status) {
      result = result.filter(l => (l.status || 'new') === filters.status);
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(l => 
        l.fullName?.toLowerCase().includes(s) || 
        l.email?.toLowerCase().includes(s) || 
        l.cpf?.includes(s)
      );
    }

    if (filters.dateStart) {
      result = result.filter(l => new Date(l.created_at) >= new Date(filters.dateStart));
    }

    if (filters.dateEnd) {
      result = result.filter(l => new Date(l.created_at) <= new Date(filters.dateEnd));
    }

    if (filters.minValue) {
      result = result.filter(l => (l.value || 0) >= parseFloat(filters.minValue));
    }

    if (filters.minCommission) {
      result = result.filter(l => (l.commission || 0) >= parseFloat(filters.minCommission));
    }

    setFilteredLeads(result);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'leads') {
        const response = await fetch('/api/admin/leads');
        const data = await response.json();
        setLeads(data || []);
      } else if (activeTab === 'api-keys') {
        const response = await fetch('/api/admin/api-keys');
        const data = await response.json();
        setApiKeys(data || []);
      } else if (activeTab === 'banners') {
        const response = await fetch('/api/banners');
        const data = await response.json();
        setBanners(data || []);
      } else if (activeTab === 'social-links') {
        const response = await fetch('/api/social-links');
        const data = await response.json();
        setSocialLinks(data || []);
      } else if (activeTab === 'terms') {
        const response = await fetch('/api/terms');
        const data = await response.json();
        setTerms(data || []);
      } else if (activeTab === 'content' || activeTab === 'settings') {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data) {
          setSiteContent({
            ...data,
            hero_image_url: data.hero_image_url || PLACEHOLDER_IMG
          });
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      // Pequeno delay para evitar flickering se a resposta for instantânea
      setTimeout(() => setIsLoading(false), 400);
    }
  };

  const SkeletonTable = () => (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-4 p-8 bg-white rounded-2xl border border-slate-100">
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-slate-100 rounded w-1/3"></div>
            <div className="h-3 bg-slate-50 rounded w-1/4"></div>
          </div>
          <div className="w-32 h-8 bg-slate-100 rounded-xl"></div>
          <div className="w-24 h-4 bg-slate-50 rounded"></div>
        </div>
      ))}
    </div>
  );

  const SkeletonGrid = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 h-32 flex items-center justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-5 bg-slate-100 rounded w-1/2"></div>
            <div className="h-3 bg-slate-50 rounded w-1/3"></div>
          </div>
          <div className="flex gap-2">
            <div className="w-20 h-10 bg-slate-100 rounded-xl"></div>
            <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const testKey = async (id: string, value: string) => {
    setTestingKeys(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch('/api/admin/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, key_value: value })
      });
      const data = await res.json();
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: data.status } : k));
      return data.status;
    } catch (err) {
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'error' } : k));
      return 'error';
    } finally {
      setTestingKeys(prev => ({ ...prev, [id]: false }));
    }
  };

  const testAllKeys = async () => {
    setIsTestingAll(true);
    setStatusMsg({ text: 'Iniciando teste de auto-correção de rede...', type: 'success' });
    for (const k of apiKeys) {
      await testKey(k.id, k.key_value);
    }
    setIsTestingAll(false);
    setStatusMsg({ text: 'Status das APIs sincronizado!', type: 'success' });
  };

  const saveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.provider || !newKey.key_value) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newKey, label: newKey.provider, status: 'active' })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Falha ao salvar chave');
      }

      setNewKey({ provider: '', key_value: '' });
      setStatusMsg({ text: 'Chave registrada com sucesso! ✅', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
      fetchData();
    } catch (err: any) { 
      setStatusMsg({ text: err.message, type: 'error' }); 
      setTimeout(() => setStatusMsg(null), 5000);
    }
    finally { setIsLoading(false); }
  };

  const onUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMsg({ text: 'Processando mídia...', type: 'success' });

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const type = file.type.startsWith('video') ? 'video' : 'image';
        
        try {
          const response = await fetch('/api/admin/banners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: base64,
              type: type,
              duration: 5000,
              active: true
            })
          });

          if (!response.ok) throw new Error('Falha no upload');
          const data = await response.json();

          setBanners(prev => [data, ...prev]);
          setStatusMsg({ text: 'Mídia adicionada com sucesso! 🎬', type: 'success' });
          setTimeout(() => setStatusMsg(null), 3000);
        } catch (err: any) {
          setStatusMsg({ text: err.message, type: 'error' });
          setTimeout(() => setStatusMsg(null), 5000);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Erro no upload:', err);
      setStatusMsg({ text: 'Falha ao processar mídia.', type: 'error' });
      setIsLoading(false);
    }
  };

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Falha ao atualizar status');

      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      if (selectedLead?.id === id) setSelectedLead({ ...selectedLead, status });
      setStatusMsg({ text: `Lead marcado como ${status === 'executed' ? 'executado' : 'novo'}! ✅`, type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const updateLeadFinance = async (id: string, field: string, value: number) => {
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (!response.ok) throw new Error('Falha ao atualizar campo');

      setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
      if (selectedLead?.id === id) setSelectedLead({ ...selectedLead, [field]: value });
    } catch (err: any) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setStatusMsg({ text: `${label} copiado para a área de transferência! 📋`, type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const downloadInvoice = (base64: string, name: string) => {
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${base64}`;
    link.download = `fatura_${name.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  const saveSiteContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteContent)
      });
      if (!response.ok) throw new Error('Falha ao salvar configurações');

      setStatusMsg({ text: 'Alterações salvas com sucesso! ✅', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) { 
      setStatusMsg({ text: err.message, type: 'error' }); 
      setTimeout(() => setStatusMsg(null), 5000);
    }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 fixed h-full shadow-2xl z-40">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg"><Zap size={24} fill="currentColor" /></div>
          <h1 className="font-black text-xl uppercase italic tracking-tighter">Save Admin</h1>
        </div>
        
        <nav className="flex flex-col gap-2">
          <Tooltip text="Ir para o Dashboard Principal" position="right">
            <button onClick={() => setActiveTab('leads')} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'leads' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
              <LayoutGrid size={18} /> Dashboard
            </button>
          </Tooltip>
          <Tooltip text="Visualizar dados dos clientes cadastrados" position="right">
            <button onClick={() => setActiveTab('leads')} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'leads' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Users size={18} /> Leads
            </button>
          </Tooltip>
          <Tooltip text="Gerenciar e testar chaves de API das IAs" position="right">
            <button onClick={() => setActiveTab('api-keys')} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'api-keys' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Key size={18} /> APIs
            </button>
          </Tooltip>
          <Tooltip text="Configurar fotos e vídeos do carrossel principal" position="right">
            <button onClick={() => setActiveTab('banners')} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'banners' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
              <ImageIcon size={18} /> Carrossel
            </button>
          </Tooltip>
          <Tooltip text="Gerenciar links das redes sociais" position="right">
            <button onClick={() => setActiveTab('social-links')} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'social-links' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Globe size={18} /> Redes Sociais
            </button>
          </Tooltip>
          <Tooltip text="Gerenciar termos e políticas" position="right">
            <button onClick={() => setActiveTab('terms')} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'terms' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
              <FileImage size={18} /> Termos
            </button>
          </Tooltip>
          <Tooltip text="Editar textos e imagens da landing page" position="right">
            <button onClick={() => setActiveTab('content')} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'content' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Edit3 size={18} /> Conteúdo
            </button>
          </Tooltip>
        </nav>

        <div className="mt-auto space-y-4">
          <Tooltip text="Ver como o site aparece para o público" position="right">
            <Link to="/" className="w-full flex items-center justify-center gap-3 p-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg hover:bg-emerald-700 transition-all active:scale-95">
              <Globe size={16} /> Visualizar Site
            </Link>
          </Tooltip>
          <Tooltip text="Sair do painel administrativo" position="right">
            <button onClick={() => signOut()} className="w-full flex items-center justify-center gap-3 text-red-400 p-4 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 rounded-xl transition-all"><LogOut size={18} /> Sair</button>
          </Tooltip>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-12 relative">
        {statusMsg && (
          <div className={`fixed top-8 right-8 z-[200] p-6 rounded-[2rem] shadow-2xl border animate-slideIn flex items-center gap-4 min-w-[300px] ${
            statusMsg.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-red-600 text-white border-red-500'
          }`}>
            <div className="bg-white/20 p-2 rounded-xl">
              {statusMsg.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            </div>
            <div>
              <p className="font-black uppercase text-[10px] tracking-widest opacity-70">Notificação do Sistema</p>
              <p className="font-bold text-sm">{statusMsg.text}</p>
            </div>
            <button onClick={() => setStatusMsg(null)} className="ml-auto p-2 hover:bg-white/10 rounded-xl transition-all">
              <X size={18} />
            </button>
          </div>
        )}

        <header className="mb-12 flex justify-between items-end">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-800">{activeTab === 'api-keys' ? 'Gerenciador de APIs' : activeTab.replace('-', ' ')}</h2>
              <div className="flex items-center gap-2">
                {activeTab !== 'leads' && (
                  <button onClick={() => setActiveTab('leads')} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all">
                    <ArrowLeft size={12} /> Voltar ao Início
                  </button>
                )}
                <Link to="/" className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all">
                  <Globe size={12} /> Visualizar Site
                </Link>
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SISTEMA MASTER • {ADMIN_EMAILS.join(' & ')}</p>
          </div>
        </header>

        {activeTab === 'social-links' && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4">Redes Sociais</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const platform = (form.elements.namedItem('platform') as HTMLInputElement).value;
              const url = (form.elements.namedItem('url') as HTMLInputElement).value;
              await fetch('/api/admin/social-links', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ platform, url }) });
              form.reset();
              fetchData();
            }} className="flex gap-4">
              <input name="platform" placeholder="Plataforma (Ex: Instagram)" className="p-4 rounded-xl border border-slate-200 flex-1" required />
              <input name="url" placeholder="URL" className="p-4 rounded-xl border border-slate-200 flex-1" required />
              <button type="submit" className="px-6 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Adicionar</button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {socialLinks.map((link: any) => (
                <div key={link.id} className="p-6 bg-white rounded-2xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="font-black text-slate-800 uppercase text-xs">{link.platform}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{link.url}</p>
                  </div>
                  <button onClick={async () => { await fetch(`/api/admin/social-links/${link.id}`, { method: 'DELETE' }); fetchData(); }} className="text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4">Termos e Políticas</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const title = (form.elements.namedItem('title') as HTMLInputElement).value;
              const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;
              await fetch('/api/admin/terms', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ title, content }) });
              form.reset();
              fetchData();
            }} className="flex flex-col gap-4">
              <input name="title" placeholder="Título (Ex: Termos de Uso)" className="p-4 rounded-xl border border-slate-200" required />
              <textarea name="content" placeholder="Conteúdo" className="p-4 rounded-xl border border-slate-200 h-40" required />
              <button type="submit" className="px-6 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Adicionar Termo</button>
            </form>
            <div className="grid grid-cols-1 gap-4">
              {terms.map((term: any) => (
                <div key={term.id} className="p-6 bg-white rounded-2xl border border-slate-100 flex justify-between items-center">
                  <p className="font-black text-slate-800 uppercase text-xs">{term.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'api-keys' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
               <div className="flex items-center gap-8">
                  <Tooltip text="Conexão operacional e pronta para rodízio">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativa (VERDE)</span>
                    </div>
                  </Tooltip>
                  <Tooltip text="Chave válida, mas atingiu limite temporário de uso">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem Crédito (AMARELO)</span>
                    </div>
                  </Tooltip>
                  <Tooltip text="Chave inválida ou erro crítico de comunicação">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/30"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Erro (VERMELHO)</span>
                    </div>
                  </Tooltip>
               </div>
               <Tooltip text="Forçar verificação de integridade em toda a rede">
                <button 
                  disabled={isTestingAll}
                  onClick={testAllKeys}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all flex items-center gap-3 shadow-2xl active:scale-95 disabled:opacity-50"
                >
                  {isTestingAll ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
                  Testar Toda a Rede
                </button>
               </Tooltip>
            </div>

            <form onSubmit={saveApiKey} className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4">Nova Inteligência Artificial</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Modelo / Provedor</label>
                  <input type="text" placeholder="Ex: Gemini Flash 2.5" value={newKey.provider} onChange={e => setNewKey({...newKey, provider: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Chave de API (Secret)</label>
                  <input type="password" placeholder="Chave da API" value={newKey.key_value} onChange={e => setNewKey({...newKey, key_value: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all text-sm" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-[0.98]">Salvar e Ativar na Fila</button>
            </form>

            {isLoading ? <SkeletonGrid /> : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {apiKeys.map(k => {
                  const statusColor = k.status === 'active' ? 'bg-green-500 shadow-green-500/40' : k.status === 'no_credit' ? 'bg-amber-500 shadow-amber-500/40' : 'bg-red-500 shadow-red-500/40';
                  const isTesting = testingKeys[k.id];
                  const isVisible = visibleKeys[k.id];

                  return (
                    <div key={k.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 flex items-center justify-between group hover:border-blue-200 transition-all relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-2 h-full ${statusColor}`}></div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                           <h4 className="font-black text-slate-800 uppercase italic tracking-tighter text-lg">{k.provider}</h4>
                           <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse shadow-lg`}></div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                           <p className="text-[10px] font-bold text-slate-400 font-mono">
                             {isVisible ? k.key_value : `••••••••••••${k.key_value.slice(-6)}`}
                           </p>
                           <button onClick={() => setVisibleKeys(p => ({...p, [k.id]: !p[k.id]}))} className="text-slate-300 hover:text-blue-600 transition-colors">
                             {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                           </button>
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-widest mt-1">
                          Status: <span className={k.status === 'active' ? 'text-green-600' : k.status === 'no_credit' ? 'text-amber-600' : 'text-red-600'}>
                            {k.status === 'active' ? 'Conectada (OK)' : k.status === 'no_credit' ? 'Sem Crédito' : 'Desconectada/Erro'}
                          </span>
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                         <Tooltip text="Testar conexão individual agora">
                          <button 
                            onClick={() => testKey(k.id, k.key_value)} 
                            disabled={isTesting} 
                            className="flex items-center gap-2 px-4 py-3 bg-slate-50 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all disabled:opacity-50 active:scale-90"
                          >
                            {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                            Testar
                          </button>
                         </Tooltip>
                         <Tooltip text="Remover Chave do Banco">
                          <button onClick={async () => { 
                            if(confirm('Apagar chave?')) { 
                              try {
                                const response = await fetch(`/api/admin/api-keys/${k.id}`, { method: 'DELETE' });
                                if (!response.ok) throw new Error('Falha ao deletar');
                                setStatusMsg({ text: 'Chave removida! 🗑️', type: 'success' });
                                setTimeout(() => setStatusMsg(null), 3000);
                                fetchData(); 
                              } catch (err: any) {
                                setStatusMsg({ text: err.message, type: 'error' });
                              }
                            } 
                          }} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-90">
                            <Trash2 size={20} />
                          </button>
                         </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Filtros */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select 
                  value={filters.status} 
                  onChange={e => setFilters({...filters, status: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600"
                >
                  <option value="new">Novos</option>
                  <option value="executed">Executados</option>
                  <option value="">Todos</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Busca</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Nome, CPF..." 
                    value={filters.search}
                    onChange={e => setFilters({...filters, search: e.target.value})}
                    className="w-full p-3 pl-9 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Mín.</label>
                <input 
                  type="number" 
                  value={filters.minValue}
                  onChange={e => setFilters({...filters, minValue: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comissão Mín.</label>
                <input 
                  type="number" 
                  value={filters.minCommission}
                  onChange={e => setFilters({...filters, minCommission: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                <input 
                  type="date" 
                  value={filters.dateStart}
                  onChange={e => setFilters({...filters, dateStart: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600"
                />
              </div>
              <button 
                onClick={() => setFilters({ status: 'new', dateStart: '', dateEnd: '', minValue: '', minCommission: '', search: '' })}
                className="p-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <X size={14} /> Limpar
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
              {isLoading ? <SkeletonTable /> : (
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-10 py-8">Cliente</th>
                      <th className="px-10 py-8">Financeiro</th>
                      <th className="px-10 py-8">Status</th>
                      <th className="px-10 py-8 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map((l: any) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-10 py-8">
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black uppercase text-xs">
                               {l.fullName?.charAt(0)}
                             </div>
                             <div>
                               <p className="font-black text-slate-800 uppercase text-sm tracking-tight italic">{l.fullName}</p>
                               <p className="text-[10px] text-slate-400 font-bold">{l.cpf} • UC: {l.consumerUnit || 'N/A'} • {new Date(l.created_at).toLocaleDateString()}</p>
                             </div>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor: <span className="text-slate-800">R$ {l.value || 0}</span></p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comissão: <span className="text-emerald-600">R$ {l.commission || 0}</span></p>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${l.status === 'executed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                             {l.status === 'executed' ? 'Executado' : 'Novo'}
                           </span>
                        </td>
                        <td className="px-10 py-8 text-right">
                           <div className="flex justify-end gap-2">
                             <button 
                               onClick={() => setSelectedLead(l)}
                               className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                             >
                               <Eye size={16} />
                             </button>
                             {l.status !== 'executed' && (
                               <button 
                                 onClick={() => updateLeadStatus(l.id, 'executed')}
                                 className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                               >
                                 <CheckCircle2 size={16} />
                               </button>
                             )}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Modal de Detalhes do Lead */}
        {selectedLead && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">{selectedLead.fullName}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead ID: {selectedLead.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Coluna 1: Dados para Copiar */}
                <div className="space-y-8">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4 flex items-center gap-2">
                    <Copy size={16} /> Dados para Cadastro (Clique para Copiar)
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: 'Nome Completo', value: selectedLead.fullName },
                      { label: 'CPF', value: selectedLead.cpf },
                      { label: 'Unidade Consumidora (UC)', value: selectedLead.consumerUnit },
                      { label: 'E-mail', value: selectedLead.email },
                      { label: 'WhatsApp', value: selectedLead.phone },
                      { label: 'CEP', value: selectedLead.address?.zipCode },
                      { label: 'Logradouro', value: `${selectedLead.address?.street}, ${selectedLead.address?.number}` },
                      { label: 'Bairro', value: selectedLead.address?.neighborhood },
                      { label: 'Cidade/UF', value: `${selectedLead.address?.city} - ${selectedLead.address?.state}` },
                    ].map((item, i) => (
                      <div key={i} className="group relative">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">{item.label}</label>
                        <div 
                          onClick={() => copyToClipboard(item.value, item.label)}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-700 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all flex justify-between items-center"
                        >
                          {item.value}
                          <Copy size={14} className="text-slate-300 group-hover:text-blue-600" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-4">
                    <h5 className="font-black text-[10px] uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                      <DollarSign size={14} /> Lançamento Financeiro
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1">Valor da Fatura (R$)</label>
                        <input 
                          type="number" 
                          defaultValue={selectedLead.value}
                          onBlur={(e) => updateLeadFinance(selectedLead.id, 'value', parseFloat(e.target.value))}
                          className="w-full p-3 bg-white border border-emerald-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1">Comissão (R$)</label>
                        <input 
                          type="number" 
                          defaultValue={selectedLead.commission}
                          onBlur={(e) => updateLeadFinance(selectedLead.id, 'commission', parseFloat(e.target.value))}
                          className="w-full p-3 bg-white border border-emerald-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Fatura e OCR */}
                <div className="space-y-8">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4 flex items-center gap-2">
                    <FileImage size={16} /> Documento e OCR
                  </h4>

                  {selectedLead.faturaBase64 ? (
                    <div className="space-y-4">
                      <div className="relative aspect-[3/4] bg-slate-100 rounded-[2.5rem] overflow-hidden border-8 border-slate-50 shadow-inner group">
                        <img 
                          src={`data:image/png;base64,${selectedLead.faturaBase64}`} 
                          className="w-full h-full object-contain" 
                          alt="Fatura" 
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <button 
                            onClick={() => downloadInvoice(selectedLead.faturaBase64, selectedLead.fullName)}
                            className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-2xl hover:scale-105 transition-all"
                          >
                            <Download size={18} /> Baixar Fatura
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-4">
                      <FileImage size={48} />
                      <p className="font-black uppercase text-[10px] tracking-widest">Nenhuma imagem enviada</p>
                    </div>
                  )}

                  {selectedLead.extracted && (
                    <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 space-y-4">
                      <h5 className="font-black text-[10px] uppercase tracking-widest text-blue-700 flex items-center gap-2">
                        <Zap size={14} fill="currentColor" /> Dados Extraídos via OCR
                      </h5>
                      <div className="bg-white/50 p-4 rounded-xl font-mono text-[10px] text-blue-800 whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify(selectedLead.extracted, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <button 
                  onClick={() => { 
                    if(confirm('Apagar lead?')) { 
                      fetch(`/api/admin/leads/${selectedLead.id}`, { method: 'DELETE' })
                        .then(res => {
                          if (!res.ok) throw new Error('Falha ao deletar');
                          fetchData(); 
                          setSelectedLead(null); 
                          setStatusMsg({ text: 'Lead removido! 🗑️', type: 'success' });
                          setTimeout(() => setStatusMsg(null), 3000);
                        })
                        .catch(err => setStatusMsg({ text: err.message, type: 'error' }));
                    } 
                  }}
                  className="px-8 py-4 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-50 rounded-2xl transition-all"
                >
                  Excluir Lead
                </button>
                <div className="flex gap-4">
                  {selectedLead.status !== 'executed' ? (
                    <button 
                      onClick={() => updateLeadStatus(selectedLead.id, 'executed')}
                      className="px-12 py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-3"
                    >
                      <CheckCircle2 size={18} /> Marcar como Executado
                    </button>
                  ) : (
                    <button 
                      onClick={() => updateLeadStatus(selectedLead.id, 'new')}
                      className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3"
                    >
                      <RefreshCw size={18} /> Reabrir Lead
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'banners' && (
          <div className="space-y-10 animate-fadeIn">
            <div className="flex justify-between items-center">
              <button onClick={() => setActiveTab('leads')} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all">
                <ArrowLeft size={12} /> Voltar ao Dashboard
              </button>
              <button onClick={() => bannerInputRef.current?.click()} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-blue-600 transition-all shadow-2xl active:scale-95">
                <Upload size={20} /> Adicionar Nova Mídia
              </button>
              <input type="file" ref={bannerInputRef} className="hidden" accept="image/*,video/*" onChange={onUploadBanner} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {banners.map((b) => (
                <div key={b.id} className="p-6 bg-white border border-slate-200 rounded-[2.5rem] flex flex-col gap-6 shadow-lg group hover:border-blue-500/50 transition-all duration-500">
                  <div className="relative aspect-video bg-slate-100 rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-inner">
                    {b.type === 'video' ? (
                      <video src={b.url} muted autoPlay loop className="w-full h-full object-cover" />
                    ) : (
                      <img src={b.url} className="w-full h-full object-cover" alt="Banner" />
                    )}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                      <Tooltip text="Remover este slide">
                        <button 
                          onClick={async () => {
                            if(confirm('Apagar esta mídia permanentemente?')) {
                              try {
                                const response = await fetch(`/api/admin/banners/${b.id}`, { method: 'DELETE' });
                                if (!response.ok) throw new Error('Falha ao deletar');
                                setBanners(prev => prev.filter(item => item.id !== b.id));
                                setStatusMsg({ text: 'Mídia removida! 🗑️', type: 'success' });
                                setTimeout(() => setStatusMsg(null), 3000);
                              } catch (err: any) {
                                setStatusMsg({ text: err.message, type: 'error' });
                              }
                            }
                          }}
                          className="p-4 bg-white text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all shadow-2xl active:scale-90"
                        >
                          <Trash2 size={24} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{b.type} • {b.duration}ms</span>
                    <button 
                      onClick={async () => {
                        const newActive = !b.active;
                        try {
                          const response = await fetch(`/api/admin/banners/${b.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ active: newActive })
                          });
                          if (!response.ok) throw new Error('Falha ao atualizar');
                          setBanners(prev => prev.map(item => item.id === b.id ? { ...item, active: newActive } : item));
                        } catch (err: any) {
                          setStatusMsg({ text: err.message, type: 'error' });
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${b.active ? 'bg-green-100 border-green-200 text-green-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                    >
                      {b.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 space-y-12 animate-fadeIn">
            <div className="flex justify-start">
              <button onClick={() => setActiveTab('leads')} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all">
                <ArrowLeft size={12} /> Voltar ao Dashboard
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-800 border-b border-slate-50 pb-4 flex items-center gap-2"><ImageIcon size={18} className="text-blue-600" /> Identidade Visual</h3>
                <div className="space-y-6">
                  <div className="p-8 border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center gap-6 bg-slate-50 hover:border-blue-100 transition-all group">
                    {siteContent.logo_url ? <img src={siteContent.logo_url} className="h-14 object-contain" alt="Logo" /> : <div className="text-slate-300 font-black text-[10px]">SEM LOGO</div>}
                    <Tooltip text="Alterar a logo do topo do site" position="top">
                      <button onClick={() => logoInputRef.current?.click()} className="px-6 py-3 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl border border-blue-50 hover:bg-blue-600 hover:text-white transition-all active:scale-95">Alterar Logotipo</button>
                    </Tooltip>
                    <input type="file" ref={logoInputRef} className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if(file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setSiteContent({...siteContent, logo_url: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </div>
                  <div className="p-8 border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center gap-6 bg-slate-50 hover:border-blue-100 transition-all group">
                     <img src={siteContent.hero_image_url} className="w-full aspect-video object-cover rounded-[2rem] shadow-2xl" alt="Hero" />
                     <Tooltip text="Alterar a imagem de fundo atrás do título" position="top">
                      <button onClick={() => heroInputRef.current?.click()} className="px-6 py-3 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl border border-blue-50 hover:bg-blue-600 hover:text-white transition-all active:scale-95">Alterar Imagem Hero</button>
                     </Tooltip>
                     <input type="file" ref={heroInputRef} className="hidden" onChange={async (e) => {
                       const file = e.target.files?.[0]; if(file) {
                         const reader = new FileReader();
                         reader.onload = () => {
                           setSiteContent({...siteContent, hero_image_url: reader.result as string});
                         };
                         reader.readAsDataURL(file);
                       }
                     }} />
                  </div>
                  <div className="p-8 border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center gap-6 bg-slate-50 hover:border-blue-100 transition-all group">
                     <img src={siteContent.about_image_1} className="w-full aspect-square object-cover rounded-[2rem] shadow-2xl" alt="About 1" />
                     <Tooltip text="Alterar a primeira imagem da seção Sobre" position="top">
                      <button onClick={() => about1InputRef.current?.click()} className="px-6 py-3 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl border border-blue-50 hover:bg-blue-600 hover:text-white transition-all active:scale-95">Alterar Sobre 1</button>
                     </Tooltip>
                     <input type="file" ref={about1InputRef} className="hidden" onChange={async (e) => {
                       const file = e.target.files?.[0]; if(file) {
                         const reader = new FileReader();
                         reader.onload = () => {
                           setSiteContent({...siteContent, about_image_1: reader.result as string});
                         };
                         reader.readAsDataURL(file);
                       }
                     }} />
                  </div>
                  <div className="p-8 border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center gap-6 bg-slate-50 hover:border-blue-100 transition-all group">
                     <img src={siteContent.about_image_2} className="w-full aspect-square object-cover rounded-[2rem] shadow-2xl" alt="About 2" />
                     <Tooltip text="Alterar a segunda imagem da seção Sobre" position="top">
                      <button onClick={() => about2InputRef.current?.click()} className="px-6 py-3 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl border border-blue-50 hover:bg-blue-600 hover:text-white transition-all active:scale-95">Alterar Sobre 2</button>
                     </Tooltip>
                     <input type="file" ref={about2InputRef} className="hidden" onChange={async (e) => {
                       const file = e.target.files?.[0]; if(file) {
                         const reader = new FileReader();
                         reader.onload = () => {
                           setSiteContent({...siteContent, about_image_2: reader.result as string});
                         };
                         reader.readAsDataURL(file);
                       }
                     }} />
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-800 border-b border-slate-50 pb-4 flex items-center gap-2"><Edit3 size={18} className="text-blue-600" /> Mensagens Principais</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Título Principal (H1)</label>
                    <input type="text" value={siteContent.hero_title} onChange={e => setSiteContent({...siteContent, hero_title: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold outline-none focus:border-blue-600 transition-all text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Texto Explicativo</label>
                    <textarea value={siteContent.hero_subtitle} onChange={e => setSiteContent({...siteContent, hero_subtitle: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold h-40 resize-none outline-none focus:border-blue-600 transition-all text-sm leading-relaxed" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">WhatsApp (Dígitos)</label>
                    <input type="text" value={siteContent.whatsapp} onChange={e => setSiteContent({...siteContent, whatsapp: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold outline-none focus:border-blue-600 transition-all text-sm" placeholder="Ex: 5511999999999" />
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4 flex items-center gap-2">
                  <Settings size={16} /> Configurações de Exibição
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Botão WhatsApp</p>
                      <p className="text-[9px] text-slate-400 font-bold">Mostrar botão flutuante no site</p>
                    </div>
                    <button 
                      onClick={() => setSiteContent({...siteContent, show_whatsapp: !siteContent.show_whatsapp})}
                      className={`w-14 h-8 rounded-full transition-all relative ${siteContent.show_whatsapp ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${siteContent.show_whatsapp ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                  <div className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Botão Especialista</p>
                      <p className="text-[9px] text-slate-400 font-bold">Mostrar botão de chat no Hero</p>
                    </div>
                    <button 
                      onClick={() => setSiteContent({...siteContent, show_specialist_btn: !siteContent.show_specialist_btn})}
                      className={`w-14 h-8 rounded-full transition-all relative ${siteContent.show_specialist_btn ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${siteContent.show_specialist_btn ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-4 flex items-center gap-2">
                  <BrainCircuit size={16} /> Inteligência Artificial (Lexi)
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Regras de Atendimento</label>
                    <textarea 
                      value={siteContent.ai_rules} 
                      onChange={e => setSiteContent({...siteContent, ai_rules: e.target.value})}
                      placeholder="Ex: Use gatilhos de economia. Não garanta 30%..."
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all text-sm min-h-[150px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Memória Inteligente / Conhecimento</label>
                    <textarea 
                      value={siteContent.ai_memory} 
                      onChange={e => setSiteContent({...siteContent, ai_memory: e.target.value})}
                      placeholder="Informações específicas sobre a empresa, planos, etc."
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all text-sm min-h-[150px]"
                    />
                  </div>
                </div>
              </div>
            </div>
            <button onClick={saveSiteContent} className="w-full py-7 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">
              <Save size={24}/> SALVAR ALTERAÇÕES
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
