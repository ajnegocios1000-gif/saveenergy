
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Zap, FileText, Sparkles, Lightbulb, LogIn, Phone, User as UserIcon, Save } from 'lucide-react';
import { Message } from '../types';
import { getGeminiResponse, analyzeBill } from '../src/services/geminiService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const ChatInterface: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string, whatsapp: string } | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [tempProfile, setTempProfile] = useState({ full_name: '', whatsapp: '' });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      loadChatHistory();
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('site_content').select('*').maybeSingle();
    if (data) setSettings(data);
  };

  const fetchProfile = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user?.id).maybeSingle();
    if (data) {
      setProfile(data);
      if (!data.whatsapp || !data.full_name) {
        setShowProfileForm(true);
        setTempProfile({ full_name: data.full_name || '', whatsapp: data.whatsapp || '' });
      }
    } else if (user) {
      setShowProfileForm(true);
    }
  };

  const loadChatHistory = async () => {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: true });
    
    if (data && data.length > 0) {
      const history: Message[] = data.map((m: any) => ({
        role: m.role as 'user' | 'model',
        parts: [{ text: m.content }]
      }));
      setMessages(history);
    } else {
      setMessages([
        { 
          role: 'model', 
          parts: [{ text: 'Olá! Sou o EcoAgente, seu especialista em economia de energia. Posso te ajudar a entender sua conta de luz e dar dicas para reduzir seus gastos. Como posso ajudar hoje?' }] 
        }
      ]);
    }
  };

  const saveMessage = async (role: 'user' | 'model', content: string) => {
    if (!user) return;
    await supabase.from('chat_history').insert([{
      user_id: user.id,
      role,
      content
    }]);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempProfile.full_name || !tempProfile.whatsapp) return;
    
    const { error } = await supabase.from('profiles').upsert({
      id: user?.id,
      full_name: tempProfile.full_name,
      whatsapp: tempProfile.whatsapp,
      updated_at: new Date().toISOString()
    });

    if (!error) {
      setProfile({ full_name: tempProfile.full_name, whatsapp: tempProfile.whatsapp });
      setShowProfileForm(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const userMsg: Message = { 
      role: 'user', 
      parts: [{ text: `[Arquivo enviado: ${file.name}] Por favor, analise esta fatura para mim.` }] 
    };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage('user', userMsg.parts[0].text);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const data = await analyzeBill(base64, file.type);

        if (data.nitidez_ok) {
          const analysisText = `Análise da Fatura Concluída! ✅
          
Titular: ${data.nome || 'Não identificado'}
Endereço: ${data.logradouro}, ${data.bairro} - ${data.cidade}/${data.uf}

Com base nesses dados, posso te ajudar a economizar até 20% na sua conta. Gostaria de saber como?`;
          
          setMessages(prev => [...prev, { role: 'model', parts: [{ text: analysisText }] }]);
          await saveMessage('model', analysisText);
        } else {
          const errorText = 'A imagem da fatura parece estar ilegível. Poderia enviar uma foto mais nítida ou o arquivo PDF original?';
          setMessages(prev => [...prev, { role: 'model', parts: [{ text: errorText }] }]);
          await saveMessage('model', errorText);
        }
      } catch (error) {
        const errorText = 'Houve um erro ao processar sua fatura. Tente novamente em instantes.';
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: errorText }] }]);
        await saveMessage('model', errorText);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage('user', input);
    setInput('');
    setIsLoading(true);

    try {
      const text = await getGeminiResponse(input, messages, settings?.ai_rules, settings?.ai_memory);
      if (text) {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text }] }]);
        await saveMessage('model', text);
      }
    } catch (error) {
      const errorText = 'Desculpe, tive uma instabilidade técnica. Pode repetir sua pergunta sobre energia?';
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: errorText }] }]);
      await saveMessage('model', errorText);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-12 flex flex-col items-center justify-center text-center space-y-8 animate-fadeIn max-w-2xl mx-auto mt-20">
        <div className="w-24 h-24 bg-amber-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-amber-500/30">
          <Zap size={48} fill="currentColor" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Acesso Restrito ao Chat</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Para conversar com o EcoAgente e salvar seu histórico de economia, você precisa estar logado.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Link to="/login" className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95">Entrar agora</Link>
          <Link to="/register" className="flex-1 py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-amber-600 transition-all active:scale-95">Criar conta gratuita</Link>
        </div>
      </div>
    );
  }

  if (showProfileForm) {
    return (
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-12 flex flex-col items-center justify-center text-center space-y-8 animate-fadeIn max-w-2xl mx-auto mt-20">
        <div className="w-20 h-20 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-blue-600/30">
          <UserIcon size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Quase lá!</h2>
          <p className="text-slate-500 font-medium">Complete seu perfil para continuar a conversa.</p>
        </div>
        <form onSubmit={handleUpdateProfile} className="w-full space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome Completo</label>
            <input 
              required
              type="text" 
              value={tempProfile.full_name} 
              onChange={e => setTempProfile({...tempProfile, full_name: e.target.value})}
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all"
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">WhatsApp</label>
            <input 
              required
              type="tel" 
              value={tempProfile.whatsapp} 
              onChange={e => setTempProfile({...tempProfile, whatsapp: e.target.value})}
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all"
              placeholder="Ex: 5511999999999"
            />
          </div>
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3">
            <Save size={18} /> Salvar e Iniciar Chat
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 h-[calc(100vh-180px)] flex flex-col overflow-hidden animate-fadeIn max-w-4xl mx-auto mt-8">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg">
            <Zap size={20} fill="currentColor" />
          </div>
          <div className="text-white">
            <h2 className="font-black text-base tracking-tight leading-none mb-1">Eco<span className="text-amber-400">Agente</span></h2>
            <div className="flex items-center gap-1.5 text-[8px] text-slate-400 uppercase tracking-widest font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              SISTEMA ATIVO • ESPECIALISTA IA
            </div>
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf,image/*" 
          onChange={handleFileUpload} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20"
        >
          <FileText size={14} />
          Análise de Fatura
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-[#F8FAFC]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-4 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-amber-500 text-white'}`}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`p-5 rounded-3xl text-sm md:text-base leading-relaxed whitespace-pre-wrap shadow-sm border ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-tr-none border-slate-700' : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'}`}>
                {msg.parts[0].text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white animate-pulse">
              <Sparkles size={20} />
            </div>
            <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
              <Loader2 className="animate-spin text-amber-500" size={16} />
              <span className="text-xs font-bold text-slate-500 tracking-tight">Analisando dados energéticos...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-white border-t border-slate-100">
        <div className="flex items-center gap-3 bg-slate-50 rounded-2xl border border-slate-200 px-4 py-3 focus-within:ring-4 focus-within:ring-amber-500/10 focus-within:border-amber-500 transition-all shadow-inner">
          <input
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte sobre sua conta, ar-condicionado, luzes..."
            className="flex-1 bg-transparent outline-none text-sm md:text-base py-1 font-medium text-slate-700"
          />
          <button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading} 
            className="bg-amber-500 text-white p-3 rounded-xl hover:bg-amber-600 disabled:bg-slate-300 transition-all shadow-xl shadow-amber-500/20 active:scale-95"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[9px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">Tecnologia EcoAgente • Consultoria Sustentável baseada em IA</p>
      </div>
    </div>
  );
};

export default ChatInterface;
