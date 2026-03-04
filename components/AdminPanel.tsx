
import React, { useState, useEffect, useRef } from 'react';
import { Users, Image as ImageIcon, CheckCircle, Trash2, Plus, LogOut, Zap, Upload, Home, AlertCircle, Loader2, LayoutDashboard, Globe, Save, Info, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MASTER_EMAIL = 'pereira.itapema@gmail.com';

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
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leadsRes, bannersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/leads'),
        fetch('/api/banners'),
        fetch('/api/settings')
      ]);
      setLeads(await leadsRes.json());
      setBanners(await bannersRes.json());
      setSettings(await settingsRes.json());
    } catch (error) { 
      console.error('Erro ao buscar dados:', error); 
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setStatusMsg({ text: 'Configurações do site atualizadas!', type: 'success' });
      } else {
        throw new Error();
      }
    } catch (error) {
      setStatusMsg({ text: 'Erro ao salvar configurações.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBanners = async (newBanners: any[]) => {
    setBanners(newBanners);
    try {
      await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBanners)
      });
    } catch (error) {
      console.error('Erro ao atualizar banners:', error);
    }
  };

  const handleFileUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const updated = banners.map((b: any) => 
        b.id === id ? { ...b, url: base64, type: file.type.startsWith('video') ? 'video' : 'image' } : b
      );
      handleUpdateBanners(updated);
      setStatusMsg({ text: 'Mídia atualizada com sucesso!', type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {statusMsg && (
        <div className={`fixed top-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-fadeIn ${statusMsg.type === 'success' ? 'bg-white border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {statusMsg.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm uppercase tracking-tight">{statusMsg.text}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 fixed h-full shadow-2xl z-40">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-green-600 p-2 rounded-lg shadow-lg shadow-green-600/20"><Zap size={24} fill="currentColor" /></div>
          <h1 className="font-black text-xl uppercase italic tracking-tighter">Lex Admin</h1>
        </div>
        
        <nav className="flex flex-col gap-3">
          <Tooltip text="Visualizar leads e contatos" position="right">
            <button 
              onClick={() => setActiveTab('leads')} 
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'leads' ? 'bg-green-600 shadow-lg shadow-green-600/20 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Users size={18} /> Leads
            </button>
          </Tooltip>
          
          <Tooltip text="Gerenciar carrossel de mídia" position="right">
            <button 
              onClick={() => setActiveTab('banners')} 
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'banners' ? 'bg-green-600 shadow-lg shadow-green-600/20 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <ImageIcon size={18} /> Carrossel
            </button>
          </Tooltip>
          
          <Tooltip text="Editar conteúdo dinâmico do site" position="right">
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'settings' ? 'bg-green-600 shadow-lg shadow-green-600/20 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Settings size={18} /> Conteúdo
            </button>
          </Tooltip>
        </nav>

        <div className="mt-auto space-y-4">
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Acesso Master</p>
            <p className="text-[10px] font-bold text-slate-300 truncate">{MASTER_EMAIL}</p>
          </div>
          <Tooltip text="Encerrar sessão master" position="right">
            <button 
              className="w-full flex items-center gap-3 text-red-400 font-bold p-4 hover:bg-red-500/10 rounded-2xl transition-all text-xs uppercase tracking-widest" 
              onClick={handleLogout}
            >
              <LogOut size={18} /> Sair
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-12 overflow-y-auto">
        <header className="mb-12 flex justify-between items-end">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-slate-800 uppercase leading-none tracking-tighter">
              {activeTab === 'leads' ? 'Gestão de Leads' : activeTab === 'banners' ? 'Mídia do Site' : 'Configurações'}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Painel Administrativo SAVE ENERGY</p>
          </div>
          <div className="flex gap-4">
            <Tooltip text="Abrir landing page em nova aba">
              <button 
                onClick={() => window.open('/', '_blank')} 
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
              >
                <Home size={16} /> Abrir Site
              </button>
            </Tooltip>
            {activeTab === 'banners' && (
              <Tooltip text="Criar novo slide">
                <button 
                  onClick={() => handleUpdateBanners([...banners, { id: Date.now(), type: 'image', url: '', duration: 5000, active: true }])} 
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 active:scale-95"
                >
                  <Plus size={16} /> Adicionar
                </button>
              </Tooltip>
            )}
          </div>
        </header>

        {activeTab === 'settings' && settings && (
          <form onSubmit={handleUpdateSettings} className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200 space-y-10 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <LayoutDashboard size={18} className="text-green-600" />
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">Seção de Impacto (Hero)</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Título Principal</label>
                    <Tooltip text="Texto de maior destaque no topo do site">
                      <Info size={12} className="text-slate-300" />
                    </Tooltip>
                  </div>
                  <input 
                    type="text" 
                    value={settings.heroTitle} 
                    onChange={e => setSettings({...settings, heroTitle: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all" 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Subtítulo Explicativo</label>
                    <Tooltip text="Detalha a proposta de valor logo abaixo do título">
                      <Info size={12} className="text-slate-300" />
                    </Tooltip>
                  </div>
                  <textarea 
                    rows={4} 
                    value={settings.heroSubtitle} 
                    onChange={e => setSettings({...settings, heroSubtitle: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none resize-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Globe size={18} className="text-green-600" />
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">Contatos & Performance</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Economia (%)</label>
                      <Tooltip text="Valor exibido nos badges de destaque">
                        <Info size={12} className="text-slate-300" />
                      </Tooltip>
                    </div>
                    <input 
                      type="text" 
                      value={settings.savingsPercent} 
                      onChange={e => setSettings({...settings, savingsPercent: e.target.value})} 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all text-center" 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">WhatsApp ID</label>
                      <Tooltip text="Número para o suporte (apenas dígitos)">
                        <Info size={12} className="text-slate-300" />
                      </Tooltip>
                    </div>
                    <input 
                      type="text" 
                      value={settings.whatsapp} 
                      onChange={e => setSettings({...settings, whatsapp: e.target.value})} 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Instagram Link</label>
                  <input 
                    type="text" 
                    value={settings.instagram} 
                    onChange={e => setSettings({...settings, instagram: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">LinkedIn Link</label>
                  <input 
                    type="text" 
                    value={settings.linkedin} 
                    onChange={e => setSettings({...settings, linkedin: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all" 
                  />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Tooltip text="Publicar alterações imediatamente">
                <button 
                  disabled={isSaving} 
                  className="w-full py-6 bg-green-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-green-700 transition-all shadow-2xl shadow-green-600/30 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} fill="currentColor" /> Atualizar Plataforma</>}
                </button>
              </Tooltip>
            </div>
          </form>
        )}

        {/* Tab Content: Banners */}
        {activeTab === 'banners' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
            {banners.map((b: any, idx) => (
              <div key={b.id} className="p-6 bg-white border border-slate-200 rounded-[2.5rem] flex flex-col gap-6 shadow-lg group hover:border-green-500/50 transition-all duration-500 overflow-hidden relative">
                <div className="relative aspect-video bg-slate-100 rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-inner group-hover:scale-[1.02] transition-transform duration-500">
                  {b.url ? (
                    b.type === 'video' ? 
                      <video src={b.url} muted autoPlay loop className="w-full h-full object-cover" /> : 
                      <img src={b.url} className="w-full h-full object-cover" alt="Banner" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 font-black italic gap-2 bg-slate-50">
                      <ImageIcon size={48} className="opacity-20" />
                      <span className="text-[10px] uppercase tracking-[0.2em]">Sem Mídia Carregada</span>
                    </div>
                  )}
                  
                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                    <Tooltip text="Alterar mídia deste slide">
                      <button 
                        onClick={() => fileInputRefs.current[b.id]?.click()} 
                        className="p-4 bg-white text-slate-900 rounded-full hover:bg-green-600 hover:text-white transition-all shadow-2xl active:scale-90"
                      >
                        <Upload size={24} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Remover slide permanentemente">
                      <button 
                        onClick={() => {
                          const updated = banners.filter((item: any) => item.id !== b.id);
                          handleUpdateBanners(updated);
                          setStatusMsg({ text: 'Banner removido!', type: 'success' });
                        }} 
                        className="p-4 bg-white text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all shadow-2xl active:scale-90"
                      >
                        <Trash2 size={24} />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={el => { fileInputRefs.current[b.id] = el; }} 
                  className="hidden" 
                  accept="image/*,video/*" 
                  onChange={(e) => handleFileUpload(b.id, e)} 
                />

                <div className="flex items-center justify-between px-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duração (ms)</label>
                      <Tooltip text="Tempo que o slide fica visível (5000 = 5s)">
                        <Info size={10} className="text-slate-200" />
                      </Tooltip>
                    </div>
                    <input 
                      type="number" 
                      value={b.duration} 
                      onChange={e => {
                        const updated = [...banners];
                        updated[idx].duration = parseInt(e.target.value);
                        handleUpdateBanners(updated);
                      }}
                      className="w-32 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-green-500 transition-colors" 
                    />
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                    <button 
                      onClick={() => {
                        const updated = [...banners];
                        updated[idx].active = !updated[idx].active;
                        handleUpdateBanners(updated);
                      }}
                      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${b.active ? 'bg-green-100 border-green-200 text-green-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                    >
                      {b.active ? 'Ativo' : 'Pausado'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => handleUpdateBanners([...banners, { id: Date.now(), type: 'image', url: '', duration: 5000, active: true }])} 
              className="min-h-[300px] border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-green-600 hover:border-green-600 hover:bg-green-50/30 transition-all group"
            >
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center group-hover:border-green-600 group-hover:rotate-90 transition-all duration-500">
                <Plus size={48} />
              </div>
              <span className="font-black uppercase tracking-[0.3em] text-xs">Novo Slide de Mídia</span>
            </button>
          </div>
        )}

        {/* Tab Content: Leads */}
        {activeTab === 'leads' && (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
             <table className="w-full text-left">
               <thead className="bg-slate-900 text-white">
                 <tr>
                   <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest border-r border-white/5">
                     <div className="flex items-center gap-2">
                       Titular do Lead
                       <Tooltip text="Nome e E-mail capturados no checkout">
                         <Info size={12} className="text-white/20" />
                       </Tooltip>
                     </div>
                   </th>
                   <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest border-r border-white/5">
                     <div className="flex items-center gap-2">
                       WhatsApp
                       <Tooltip text="Link direto para o chat do cliente">
                         <Info size={12} className="text-white/20" />
                       </Tooltip>
                     </div>
                   </th>
                   <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-right">
                     <div className="flex items-center justify-end gap-2">
                       Origem (CEP)
                       <Tooltip text="Localização extraída via IA Lexi">
                         <Info size={12} className="text-white/20" />
                       </Tooltip>
                     </div>
                   </th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {leads.map((lead: any) => (
                   <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                     <td className="px-8 py-6">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                           <User size={20} />
                         </div>
                         <div>
                          <p className="font-black text-slate-800 tracking-tight text-sm uppercase italic">{lead.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-bold lowercase">{lead.email}</p>
                         </div>
                       </div>
                     </td>
                     <td className="px-8 py-6">
                        <a 
                          href={`https://wa.me/${lead.phone.replace(/[^\d]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 group-hover:bg-green-600 group-hover:text-white transition-all shadow-sm flex items-center gap-2 w-fit"
                        >
                          <MessageCircle size={12} /> {lead.phone}
                        </a>
                     </td>
                     <td className="px-8 py-6 text-right">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">{lead.address?.city || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lead.address?.state || 'UF'}</p>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
             {leads.length === 0 && (
               <div className="p-32 text-center flex flex-col items-center gap-4">
                 <div className="p-10 bg-slate-50 rounded-full border border-slate-100">
                    <Users size={64} className="text-slate-200" />
                 </div>
                 <div>
                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Base de leads vazia</p>
                    <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-1">Nenhum cadastro realizado via formulário Lexi.</p>
                 </div>
               </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

// Simple Icons
const User = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const MessageCircle = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;

export default AdminPanel;
