
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Image as ImageIcon, CheckCircle, Trash2, Plus, LogOut, 
  Zap, Home, AlertCircle, Loader2, Key, RefreshCw, 
  Settings, Save, Play, Eye, EyeOff, Edit3, Upload, Film,
  LayoutDashboard, Globe, FileImage, Layout, Check, Info, ArrowLeft, LayoutGrid
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const MASTER_EMAIL = 'pereira.itapema@gmail.com';
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
  const [banners, setBanners] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [siteContent, setSiteContent] = useState<any>({
    logo_url: '',
    hero_image_url: PLACEHOLDER_IMG,
    hero_title: 'Economize até 30% na sua conta de luz',
    hero_subtitle: 'Energia solar compartilhada sem investimento.'
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

  useEffect(() => {
    if (user && user.email !== MASTER_EMAIL) navigate('/');
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'leads') {
        const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
        setLeads(data || []);
      } else if (activeTab === 'api-keys') {
        const { data } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
        setApiKeys(data || []);
      } else if (activeTab === 'banners') {
        const { data } = await supabase.from('banners').select('*').order('created_at', { ascending: false });
        setBanners(data || []);
      } else if (activeTab === 'content' || activeTab === 'settings') {
        const { data } = await supabase.from('site_content').select('*').maybeSingle();
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
      await supabase.from('api_keys').insert([{ ...newKey, label: newKey.provider, status: 'active' }]);
      setNewKey({ provider: '', key_value: '' });
      setStatusMsg({ text: 'Chave registrada! Testando conexão...', type: 'success' });
      fetchData();
    } catch (err: any) { setStatusMsg({ text: err.message, type: 'error' }); }
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
        
        const { data, error } = await supabase
          .from('banners')
          .insert([{
            url: base64,
            type: type,
            duration: 5000,
            active: true
          }])
          .select()
          .single();

        if (error) throw error;

        setBanners(prev => [data, ...prev]);
        setStatusMsg({ text: 'Mídia adicionada com sucesso!', type: 'success' });
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Erro no upload:', err);
      setStatusMsg({ text: 'Falha ao salvar mídia.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSiteContent = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('site_content').upsert({ id: 1, ...siteContent });
      if (error) throw error;
      setStatusMsg({ text: 'Conteúdo visual atualizado!', type: 'success' });
    } catch (err: any) { setStatusMsg({ text: err.message, type: 'error' }); }
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
          <Tooltip text="Editar textos e imagens da landing page" position="right">
            <button onClick={() => setActiveTab('content')} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'content' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Globe size={18} /> Conteúdo
            </button>
          </Tooltip>
        </nav>

        <div className="mt-auto space-y-4">
          <Tooltip text="Ver como o site aparece para o público" position="right">
            <Link to="/" className="w-full flex items-center justify-center gap-3 p-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg hover:bg-emerald-700 transition-all active:scale-95">
              <ArrowLeft size={16} /> Voltar ao Site
            </Link>
          </Tooltip>
          <Tooltip text="Sair do painel administrativo" position="right">
            <button onClick={() => signOut()} className="w-full flex items-center justify-center gap-3 text-red-400 p-4 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 rounded-xl transition-all"><LogOut size={18} /> Sair</button>
          </Tooltip>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-12">
        <header className="mb-12 flex justify-between items-end">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-800">{activeTab === 'api-keys' ? 'Gerenciador de APIs' : activeTab.replace('-', ' ')}</h2>
              {activeTab !== 'leads' && (
                <button onClick={() => setActiveTab('leads')} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all">
                  <ArrowLeft size={12} /> Voltar ao Início
                </button>
              )}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SISTEMA MASTER • {MASTER_EMAIL}</p>
          </div>
          {statusMsg && (
            <div className={`p-4 rounded-2xl font-bold text-[10px] uppercase flex items-center gap-3 animate-fadeIn border ${statusMsg.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
              <Check size={16} /> {statusMsg.text}
            </div>
          )}
        </header>

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
                           <div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`}></div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                           <p className="text-[10px] font-bold text-slate-400 font-mono">
                             {isVisible ? k.key_value : `••••••••••••${k.key_value.slice(-6)}`}
                           </p>
                           <button onClick={() => setVisibleKeys(p => ({...p, [k.id]: !p[k.id]}))} className="text-slate-300 hover:text-blue-600 transition-colors">
                             {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                           </button>
                        </div>
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
                          <button onClick={async () => { if(confirm('Apagar chave?')) { await supabase.from('api_keys').delete().eq('id', k.id); fetchData(); } }} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-90">
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
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
            {isLoading ? <SkeletonTable /> : (
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                  <tr><th className="px-10 py-8">Dados do Cliente</th><th className="px-10 py-8">Contato</th><th className="px-10 py-8 text-right">Data</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-10 py-8">
                         <p className="font-black text-slate-800 uppercase text-sm tracking-tight italic">{l.fullName}</p>
                         <p className="text-[10px] text-slate-400 font-bold">{l.email}</p>
                      </td>
                      <td className="px-10 py-8">
                         <a href={`https://wa.me/${l.phone.replace(/[^\d]/g, '')}`} target="_blank" className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black text-[10px] hover:bg-emerald-600 hover:text-white transition-all inline-flex items-center gap-2">
                           <Zap size={14} fill="currentColor" /> {l.phone}
                         </a>
                      </td>
                      <td className="px-10 py-8 text-right text-slate-400 text-xs font-bold">{new Date(l.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
                              const { error } = await supabase.from('banners').delete().eq('id', b.id);
                              if (!error) {
                                setBanners(prev => prev.filter(item => item.id !== b.id));
                                setStatusMsg({ text: 'Mídia removida!', type: 'success' });
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
                        const { error } = await supabase.from('banners').update({ active: newActive }).eq('id', b.id);
                        if (!error) {
                          setBanners(prev => prev.map(item => item.id === b.id ? { ...item, active: newActive } : item));
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
