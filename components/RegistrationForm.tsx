
// components/RegistrationForm.tsx - Multi-step registration form with OCR integration and improved feedback
import React, { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, FileText, Upload, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Zap, Loader2, AlertCircle, ScanLine, BrainCircuit, Cpu } from 'lucide-react';
import { analyzeBill } from '../src/services/geminiService';

const validateCPF = (cpf: string) => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) return false;
  let sum = 0;
  for (let i = 1; i <= 9; i++) sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleanCPF.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleanCPF.substring(10, 11))) return false;
  return true;
};

const RegistrationForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
    consumerUnit: '',
    address: {
      zipCode: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: ''
    }
  });

  const [file, setFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...(prev[parent as keyof typeof prev] as any), [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/[^\d]/g, '');
    updateFormData('address.zipCode', cleanCEP);
    if (cleanCEP.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: {
              ...prev.address,
              street: data.logradouro || prev.address.street,
              neighborhood: data.bairro || prev.address.neighborhood,
              city: data.localidade,
              state: data.uf
            }
          }));
        }
      } catch (e) { console.error("Erro CEP", e); }
    }
  };

  const runExtraction = async (selectedFile: File, base64: string) => {
    setLoadingStage('Lexi analisando fatura...');
    setLoadingProgress(40);
    
    try {
      const data = await analyzeBill(base64, selectedFile.type);
      
      setLoadingProgress(100);
      setLoadingStage('Análise concluída!');

      if (data.nitidez_ok) {
        // Validação de valor mínimo
        const billValue = parseFloat(data.valor_total?.toString().replace(',', '.') || '0');
        if (billValue < 200) {
          setErrors({ file: "Faturas abaixo de R$ 200,00 não são elegíveis para o desconto." });
          setFile(null);
          setIsLoading(false);
          return;
        }

        setExtractedData(data);
        setFormData(prev => ({
          ...prev,
          fullName: data.nome || prev.fullName,
          cpf: data.cpf || prev.cpf,
          consumerUnit: data.unidade_consumidora || prev.consumerUnit,
          address: {
            ...prev.address,
            street: data.logradouro || prev.address.street,
            neighborhood: data.bairro || prev.address.neighborhood,
            city: data.cidade || prev.address.city,
            state: data.uf || prev.address.state,
            zipCode: data.cep?.replace(/[^\d]/g, '') || prev.address.zipCode
          }
        }));
        setTimeout(() => { setIsLoading(false); }, 800);
      } else {
        setErrors({ file: "Fatura ilegível. Tente uma foto mais nítida." });
        setFile(null);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Erro na extração:", err);
      setErrors({ file: "Erro técnico na análise. Preencha manualmente." });
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsLoading(true);
    setLoadingProgress(10);
    setLoadingStage('Processando arquivo...');

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImageBase64(base64);
      setLoadingProgress(30);
      runExtraction(selectedFile, base64);
    };
    reader.readAsDataURL(selectedFile);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName) newErrors.fullName = "Obrigatório";
    if (!validateCPF(formData.cpf)) newErrors.cpf = "CPF inválido";
    if (!formData.email) newErrors.email = "Obrigatório";
    if (!formData.phone) newErrors.phone = "Obrigatório";
    if (!formData.consumerUnit) newErrors.consumerUnit = "Obrigatório";
    if (!formData.address.zipCode) newErrors.zipCode = "Obrigatório";
    if (!formData.address.number) newErrors.number = "Obrigatório";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    setLoadingStage('Enviando cadastro...');
    
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, faturaBase64: imageBase64, extracted: extractedData }),
      });
      setIsSubmitted(true);
    } catch (err) {
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-white p-12 rounded-3xl shadow-2xl border border-slate-100 text-center space-y-6 animate-fadeIn">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 text-green-600 rounded-3xl mb-4 shadow-inner">
          <ShieldCheck size={56} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Solicitação Enviada!</h2>
        <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
          Nossa plataforma <strong>Lex</strong> está processando seus dados. Aguarde o contato do nosso consultor.
        </p>
        <button onClick={() => window.location.href = '/'} className="px-10 py-3 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-600/20">
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-start">
        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
          <ChevronLeft size={16} /> Voltar ao Início
        </button>
      </div>
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-slate-50 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
            <div className="relative mb-8">
               <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
               <div className="relative bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl">
                 <div className="flex gap-4">
                    <div className={`p-3 rounded-xl ${loadingProgress > 25 ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'} transition-all duration-500`}>
                      <ScanLine size={24} />
                    </div>
                    <div className={`p-3 rounded-xl ${loadingProgress > 65 ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'} transition-all duration-500`}>
                      <BrainCircuit size={24} />
                    </div>
                    <div className={`p-3 rounded-xl ${loadingProgress >= 95 ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'} transition-all duration-500`}>
                      <Cpu size={24} />
                    </div>
                 </div>
               </div>
            </div>
            <h3 className="text-xl font-black text-white mb-2">{loadingStage}</h3>
            <div className="w-full max-w-xs bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
               <div className="h-full bg-green-500 transition-all duration-300 ease-out" style={{ width: `${loadingProgress}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-4 space-y-6">
            <div className="text-left">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Passo 1: Fatura</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Análise Automática Lexi</p>
            </div>
            
            <div 
              onClick={() => document.getElementById('bill-upload')?.click()} 
              className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center gap-4 cursor-pointer transition-all ${file ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-slate-50 hover:border-green-400'}`}
            >
              <div className={`p-4 rounded-2xl shadow-sm bg-white text-slate-300 ${file ? 'text-green-600' : ''}`}>
                <Upload size={32} />
              </div>
              <div className="text-center">
                <p className="font-black text-xs text-slate-800 uppercase tracking-tight">{file ? file.name : "Carregar Fatura"}</p>
                <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">Foto ou PDF</p>
              </div>
              <input id="bill-upload" type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
            </div>
            
            {errors.file && <div className="p-3 bg-red-50 text-red-600 text-[10px] rounded-xl flex items-center gap-2 border border-red-100 font-black uppercase tracking-widest"><AlertCircle size={14} /> {errors.file}</div>}
            
            <div className="p-4 bg-slate-900 rounded-2xl space-y-3">
              <h4 className="text-green-400 font-black text-[10px] uppercase tracking-widest border-b border-white/10 pb-2">Benefícios</h4>
              <ul className="text-[9px] text-slate-300 space-y-2 font-bold uppercase tracking-wider">
                <li className="flex items-center gap-2"><Zap size={10} className="text-green-400" /> Desconto de até 30%</li>
                <li className="flex items-center gap-2"><Zap size={10} className="text-green-400" /> Sem Investimento</li>
                <li className="flex items-center gap-2"><Zap size={10} className="text-green-400" /> Ativação Imediata</li>
              </ul>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6">
            <div className="text-left border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Passo 2: Cadastro</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Confirme os dados extraídos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
                <input type="text" value={formData.fullName} onChange={e => updateFormData('fullName', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 transition-all font-bold text-slate-700 text-sm" />
                {errors.fullName && <p className="text-[9px] text-red-500 mt-1 font-black uppercase ml-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">CPF</label>
                <input type="text" value={formData.cpf} onChange={e => updateFormData('cpf', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 transition-all font-bold text-sm" placeholder="000.000.000-00" />
                {errors.cpf && <p className="text-[9px] text-red-500 mt-1 font-black uppercase ml-1">{errors.cpf}</p>}
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Unidade Consumidora (UC)</label>
                <input type="text" value={formData.consumerUnit} onChange={e => updateFormData('consumerUnit', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 transition-all font-bold text-sm" placeholder="Nº da UC na fatura" />
                {errors.consumerUnit && <p className="text-[9px] text-red-500 mt-1 font-black uppercase ml-1">{errors.consumerUnit}</p>}
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">E-mail</label>
                <input type="email" value={formData.email} onChange={e => updateFormData('email', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 transition-all font-bold text-sm" />
                {errors.email && <p className="text-[9px] text-red-500 mt-1 font-black uppercase ml-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">WhatsApp</label>
                <input type="tel" value={formData.phone} onChange={e => updateFormData('phone', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 transition-all font-bold text-sm" placeholder="(00) 90000-0000" />
                {errors.phone && <p className="text-[9px] text-red-500 mt-1 font-black uppercase ml-1">{errors.phone}</p>}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">CEP</label>
                  <input type="text" value={formData.address.zipCode} onChange={e => handleCEP(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 transition-all font-bold text-sm" placeholder="00000-000" maxLength={9} />
                  {errors.zipCode && <p className="text-[9px] text-red-500 mt-1 font-black uppercase ml-1">{errors.zipCode}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Rua/Logradouro</label>
                  <input type="text" value={formData.address.street} onChange={e => updateFormData('address.street', e.target.value)} className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nº</label>
                  <input type="text" value={formData.address.number} onChange={e => updateFormData('address.number', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
                  {errors.number && <p className="text-[9px] text-red-500 mt-1 font-black uppercase ml-1">{errors.number}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Bairro</label>
                  <input type="text" value={formData.address.neighborhood} onChange={e => updateFormData('address.neighborhood', e.target.value)} className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-sm" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">UF</label>
                  <input type="text" value={formData.address.state} readOnly className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500 text-sm" />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-3">
              <ShieldCheck size={20} /> Finalizar e Economizar
            </button>
            
            <p className="text-[8px] text-slate-400 text-center uppercase font-black tracking-[0.2em]">
              Seus dados estão protegidos pela LGPD e criptografia de ponta a ponta.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;
