
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
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    confirmEmail: '',
    phone: '',
    cpf: '',
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

  // Fixed progress bar logic to avoid hanging
  const runExtraction = async (selectedFile: File, base64: string) => {
    setLoadingStage('Iniciando análise Lexi...');
    setLoadingProgress(40);
    
    try {
      const data = await analyzeBill(base64, selectedFile.type);
      
      setLoadingProgress(100);
      setLoadingStage('Análise concluída!');

      if (data.nitidez_ok) {
        setExtractedData(data);
        setFormData(prev => ({
          ...prev,
          fullName: data.nome || prev.fullName,
          address: {
            ...prev.address,
            street: data.logradouro || prev.address.street,
            neighborhood: data.bairro || prev.address.neighborhood,
            city: data.cidade || prev.address.city,
            state: data.uf || prev.address.state,
            zipCode: data.cep?.replace(/[^\d]/g, '') || prev.address.zipCode
          }
        }));
        setTimeout(() => { setIsLoading(false); setStep(2); }, 800);
      } else {
        setErrors({ file: "Fatura ilegível ou dados não encontrados. Tente uma foto mais nítida." });
        setFile(null);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Erro na extração:", err);
      setErrors({ file: "Houve um problema técnico na análise. Tente novamente ou preencha manualmente." });
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsLoading(true);
    setLoadingProgress(10);
    setLoadingStage('Preparando arquivo...');

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImageBase64(base64);
      setLoadingProgress(30);
      runExtraction(selectedFile, base64);
    };
    reader.readAsDataURL(selectedFile);
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    if (step === 2) {
      if (!formData.fullName) newErrors.fullName = "Nome obrigatório";
      if (!validateCPF(formData.cpf)) newErrors.cpf = "CPF inválido";
      if (!formData.email) newErrors.email = "E-mail obrigatório";
      if (formData.email !== formData.confirmEmail) newErrors.confirmEmail = "E-mails não batem";
      if (!formData.phone) newErrors.phone = "WhatsApp obrigatório";
    }
    if (step === 3) {
      if (!formData.address.zipCode) newErrors.zipCode = "CEP obrigatório";
      if (!formData.address.number) newErrors.number = "Nº obrigatório";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validateStep()) setStep(s => s + 1); };
  const handleBack = () => { if (step > 1) setStep(s => s - 1); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    
    setIsLoading(true);
    setLoadingStage('Salvando seu cadastro...');
    
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, faturaBase64: imageBase64, extracted: extractedData }),
      });
      setIsSubmitted(true);
    } catch (err) {
      alert('Erro ao salvar cadastro. Tente novamente.');
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
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6 px-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`flex items-center ${i < 4 ? 'flex-1' : ''}`}>
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-black text-sm md:text-lg transition-all shadow-sm ${step >= i ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                {i}
              </div>
              {i < 4 && <div className={`h-1.5 flex-1 mx-2 md:mx-3 rounded-full transition-all ${step > i ? 'bg-green-600' : 'bg-slate-100'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl border border-slate-50 relative overflow-hidden min-h-[450px]">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
            <div className="relative mb-8">
               <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
               <div className="relative bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
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
            <span className="mt-2 text-green-500 font-black text-xs">{Math.round(loadingProgress)}%</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-black text-slate-800">Inicie pela Fatura</h3>
              <p className="text-slate-500">Nossa IA Lexi vai ler os dados por você.</p>
            </div>
            <div onClick={() => document.getElementById('bill-upload')?.click()} className={`border-3 border-dashed rounded-3xl p-10 md:p-16 flex flex-col items-center gap-6 cursor-pointer transition-all ${file ? 'border-green-600 bg-green-50' : 'border-slate-300 bg-slate-50 hover:border-green-400'}`}>
              <div className={`p-8 rounded-2xl shadow-xl bg-white text-slate-400 ${file ? 'text-green-600' : ''}`}>
                <Upload size={48} />
              </div>
              <div className="text-center">
                <p className="font-black text-xl text-slate-800">{file ? file.name : "Toque para enviar Fatura"}</p>
                <p className="text-sm text-slate-400 mt-2 font-medium">Aceitamos Fotos nítidas ou PDF digital.</p>
              </div>
              <input id="bill-upload" type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
            </div>
            {errors.file && <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl flex items-center gap-3 border border-red-100 font-bold"><AlertCircle size={20} /> {errors.file}</div>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-green-50 text-green-700 text-[10px] rounded-xl font-black flex items-center gap-2 mb-2 border border-green-100 uppercase tracking-widest">
              <CheckCircle2 size={16} /> Verificação via Plataforma Lex Concluída
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</label>
              <input type="text" value={formData.fullName} onChange={e => updateFormData('fullName', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-green-500/10 font-bold text-slate-700" />
              {errors.fullName && <p className="text-[10px] text-red-500 mt-1 font-black">{errors.fullName}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CPF</label>
              <input type="text" value={formData.cpf} onChange={e => updateFormData('cpf', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-green-500/10 font-bold" placeholder="000.000.000-00" />
              {errors.cpf && <p className="text-[10px] text-red-500 mt-1 font-black">{errors.cpf}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail</label>
                <input type="email" value={formData.email} onChange={e => updateFormData('email', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                {errors.email && <p className="text-[10px] text-red-500 mt-1 font-black">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirmar E-mail</label>
                <input type="email" value={formData.confirmEmail} onChange={e => updateFormData('confirmEmail', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                {errors.confirmEmail && <p className="text-[10px] text-red-500 mt-1 font-black">{errors.confirmEmail}</p>}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp</label>
              <input type="tel" value={formData.phone} onChange={e => updateFormData('phone', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="(00) 90000-0000" />
              {errors.phone && <p className="text-[10px] text-red-500 mt-1 font-black">{errors.phone}</p>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
             <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CEP (Busca Automática)</label>
              <input type="text" value={formData.address.zipCode} onChange={e => handleCEP(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="00000-000" maxLength={9} />
              {errors.zipCode && <p className="text-[10px] text-red-500 mt-1 font-black">{errors.zipCode}</p>}
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rua/Logradouro</label>
                <input type="text" value={formData.address.street} onChange={e => updateFormData('address.street', e.target.value)} className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nº</label>
                <input type="text" value={formData.address.number} onChange={e => updateFormData('address.number', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                {errors.number && <p className="text-[10px] text-red-500 mt-1 font-black">{errors.number}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bairro</label>
                <input type="text" value={formData.address.neighborhood} onChange={e => updateFormData('address.neighborhood', e.target.value)} className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cidade</label>
                   <input type="text" value={formData.address.city} readOnly className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-500" />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">UF</label>
                   <input type="text" value={formData.address.state} readOnly className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-900 text-white p-8 rounded-3xl space-y-6 shadow-2xl">
              <h4 className="text-green-400 font-black text-xs uppercase tracking-widest border-b border-white/10 pb-4">Check-out Final SAVE ENERGY</h4>
              <div className="text-sm space-y-4">
                 <p className="flex justify-between items-center"><span className="text-slate-400 uppercase text-[10px]">Titular:</span> <span className="font-bold">{formData.fullName}</span></p>
                 <p className="flex justify-between items-center"><span className="text-slate-400 uppercase text-[10px]">CPF:</span> <span className="font-bold">{formData.cpf}</span></p>
                 <p className="flex justify-between items-center"><span className="text-slate-400 uppercase text-[10px]">Economia Estimada:</span> <span className="text-green-400 font-black text-lg">15% a 20%</span></p>
                 <p className="flex justify-between items-center"><span className="text-slate-400 uppercase text-[10px]">Plataforma:</span> <span className="bg-green-600 px-3 py-1 rounded-full text-[10px] font-black">LEX DIGITAL</span></p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center uppercase font-black tracking-widest leading-relaxed">
              Ao confirmar, seus dados serão criptografados e enviados para validação contratual.
            </p>
          </div>
        )}

        <div className="flex justify-between items-center pt-8">
          {step > 1 ? (
            <button onClick={handleBack} className="text-slate-500 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:text-green-600 transition-colors"><ChevronLeft size={16} /> Voltar</button>
          ) : <div />}
          
          {step < 4 ? (
            <button onClick={handleNext} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-green-700 transition-all flex items-center gap-2">Continuar <ChevronRight size={16} /></button>
          ) : (
            <button onClick={handleSubmit} className="bg-green-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-green-700 transition-all scale-105 active:scale-95">Finalizar e Economizar</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;
