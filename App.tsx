
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Button } from './components/Button';
import { StepIndicator } from './components/StepIndicator';
import { ThumbnailData, ThumbnailResult } from './types';
import { generateThumbnailImage, refineThumbnailImage } from './services/geminiService';
import JSZip from 'jszip';

const EMOTIONS = [
  'Chocado/Surpreso', 'Feliz/Animado', 'Sério/Determinado', 
  'Assustado', 'Pensativo', 'Bravo/Intenso', 'Rindo'
];

const FRAMING_OPTIONS = [
  'Extremo Close-up (Foco no Rosto)',
  'Close-up (Rosto e Ombros)',
  'Médio (Busto)',
  'Plano Americano (Cintura para cima)',
  'Grande Angular (Personagem e Cenário)'
];

const PRESET_COLORS = [
  { name: 'Vermelho', value: '#FF1F1F' },
  { name: 'Amarelo', value: '#FFE200' },
  { name: 'Azul', value: '#00D4FF' },
  { name: 'Laranja', value: '#FF5E00' },
  { name: 'Verde', value: '#39FF14' },
  { name: 'Roxo', value: '#BC13FE' },
  { name: 'Rosa', value: '#FF007F' }
];

interface ThumbnailEditorProps {
  result: ThumbnailResult;
  accentColor: string;
  onUpdate: (updates: Partial<ThumbnailResult>) => void;
  onRefine: () => void | Promise<void>;
  onDownload: () => void;
}

const ThumbnailEditor: React.FC<ThumbnailEditorProps> = ({ 
  result, 
  accentColor,
  onUpdate, 
  onRefine, 
  onDownload 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        setScale(containerRef.current.offsetWidth / 1920);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const lines = result.overlayText.split('\n').filter(l => l.trim().length > 0);
  const yOffset = ((result.textY / 100) * 1080 - 540) * scale;

  const imageTransformStyle = {
    transform: `scale(${result.presenterZoom}) translate(${(result.presenterX - 50) / result.presenterZoom}%, ${(result.presenterY - 50) / result.presenterZoom}%)`,
    transformOrigin: 'center'
  };

  return (
    <div className="bg-zinc-900/50 rounded-[2.5rem] border border-zinc-800 p-6 space-y-6 flex flex-col transition-all hover:border-zinc-700 shadow-xl">
      <div ref={containerRef} className="relative w-full rounded-2xl overflow-hidden shadow-2xl aspect-video bg-black ring-1 ring-white/10">
        <img 
          src={result.imageUrl} 
          className="w-full h-full object-cover transition-transform duration-200" 
          alt="Background" 
          style={imageTransformStyle}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent pointer-events-none" />
        
        <div className="absolute inset-0 flex items-center justify-start pointer-events-none select-none"
             style={{ padding: `0 ${result.textX}%` }}>
          <div className="flex flex-col items-start gap-1"
               style={{ transform: `translateY(${yOffset}px)` }}>
            {lines.map((line, idx) => (
              <div key={idx} className="font-bebas uppercase italic whitespace-nowrap"
                style={{ 
                  fontSize: `${result.textSize * scale}px`,
                  color: idx % 2 === 0 ? 'white' : '#FFE200',
                  transform: `rotate(${result.textRotation + (idx % 2 === 0 ? -1 : 1)}deg) translateX(${idx * 15 * scale}px)`,
                  textShadow: `${4 * scale}px ${4 * scale}px 0px #000, 0px ${10 * scale}px ${25 * scale}px rgba(0,0,0,0.95)`,
                  lineHeight: 0.85,
                  zIndex: 20 - idx
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>

        {result.isRefining && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto shadow-blue-500/50 shadow-[0_0_15px]"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500">Renderizando Cinema...</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-8 flex-grow">
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ajuste de Texto</label>
            <span className="text-[8px] text-zinc-600 font-bold uppercase">Camada 02</span>
          </div>
          <textarea 
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white font-bebas text-xl tracking-wider focus:border-blue-500 outline-none resize-none h-32 shadow-inner"
            value={result.overlayText}
            onChange={(e) => onUpdate({ overlayText: e.target.value.toUpperCase() })}
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
             <div className="space-y-1">
                <div className="flex justify-between"><label className="text-[8px] font-black text-zinc-600 uppercase">Tamanho</label><span className="text-[8px] text-blue-500 font-bold">{result.textSize}px</span></div>
                <input type="range" min="80" max="450" className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" value={result.textSize} onChange={(e) => onUpdate({ textSize: Number(e.target.value) })} />
             </div>
             <div className="space-y-1">
                <div className="flex justify-between"><label className="text-[8px] font-black text-zinc-600 uppercase">Altura (Posição Y)</label><span className="text-[8px] text-blue-500 font-bold">{result.textY}%</span></div>
                <input type="range" min="5" max="95" className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" value={result.textY} onChange={(e) => onUpdate({ textY: Number(e.target.value) })} />
             </div>
             <div className="space-y-1">
                <div className="flex justify-between"><label className="text-[8px] font-black text-zinc-600 uppercase">Largura (Posição X)</label><span className="text-[8px] text-blue-500 font-bold">{result.textX}%</span></div>
                <input type="range" min="2" max="45" className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" value={result.textX} onChange={(e) => onUpdate({ textX: Number(e.target.value) })} />
             </div>
             <div className="space-y-1">
                <div className="flex justify-between"><label className="text-[8px] font-black text-zinc-600 uppercase">Rotação</label><span className="text-[8px] text-blue-500 font-bold">{result.textRotation}°</span></div>
                <input type="range" min="-25" max="25" className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" value={result.textRotation} onChange={(e) => onUpdate({ textRotation: Number(e.target.value) })} />
             </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-zinc-800/50">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ajuste do Apresentador</label>
            <span className="text-[8px] text-zinc-600 font-bold uppercase">Enquadramento IA</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
             <div className="space-y-1">
                <div className="flex justify-between"><label className="text-[8px] font-black text-zinc-600 uppercase">Zoom</label><span className="text-[8px] text-blue-500 font-bold">{Math.round(result.presenterZoom * 100)}%</span></div>
                <input type="range" min="1" max="2" step="0.01" className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" value={result.presenterZoom} onChange={(e) => onUpdate({ presenterZoom: Number(e.target.value) })} />
             </div>
             <div className="space-y-1">
                <div className="flex justify-between"><label className="text-[8px] font-black text-zinc-600 uppercase">Altura</label><span className="text-[8px] text-blue-500 font-bold">{result.presenterY}%</span></div>
                <input type="range" min="0" max="100" className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" value={result.presenterY} onChange={(e) => onUpdate({ presenterY: Number(e.target.value) })} />
             </div>
             <div className="space-y-1">
                <div className="flex justify-between"><label className="text-[8px] font-black text-zinc-600 uppercase">Largura</label><span className="text-[8px] text-blue-500 font-bold">{result.presenterX}%</span></div>
                <input type="range" min="0" max="100" className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" value={result.presenterX} onChange={(e) => onUpdate({ presenterX: Number(e.target.value) })} />
             </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-800 space-y-3">
        <div className="flex gap-2">
          <input 
            className="flex-grow bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-blue-500 shadow-inner"
            placeholder="Ex: Mude o fundo para um vulcão..."
            value={result.suggestion}
            onChange={(e) => onUpdate({ suggestion: e.target.value })}
          />
          <Button variant="secondary" size="sm" onClick={onRefine} disabled={result.isRefining}>Refinar</Button>
        </div>
        <Button variant="primary" className="w-full h-12 text-sm uppercase tracking-widest font-bold shadow-blue-600/20" onClick={onDownload}>Salvar Arte Final</Button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [zipSuffix, setZipSuffix] = useState('');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  
  const [thumbnailData, setThumbnailData] = useState<ThumbnailData>({
    talentImage: '',
    talentImageMimeType: '',
    emotion: 'Chocado/Surpreso',
    overlayText: 'ISSO É\nINSANO!',
    theme: '',
    accentColor: PRESET_COLORS[0].value,
    framing: FRAMING_OPTIONS[0]
  });

  const [results, setResults] = useState<ThumbnailResult[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  // Use type assertion to access aistudio methods to avoid global augmentation conflicts with the platform
  const checkApiKey = async () => {
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    } catch (e) {
      console.error("Failed to check API key", e);
      setHasApiKey(false);
    }
  };

  const handleOpenKeyDialog = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      // Proceed regardless of race conditions as instructed
      setHasApiKey(true);
    } catch (e) {
      console.error("Failed to open key selection dialog", e);
    }
  };

  const reset = () => {
    setStep(0);
    setResults([]);
    setLoading(false);
    setLoadingProgress(0);
    setZipSuffix('');
    setThumbnailData({
      talentImage: '',
      talentImageMimeType: '',
      emotion: 'Chocado/Surpreso',
      overlayText: 'ISSO É\nINSANO!',
      theme: '',
      accentColor: PRESET_COLORS[0].value,
      framing: FRAMING_OPTIONS[0]
    });
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const handleGenerate = async () => {
    setLoading(true);
    setLoadingProgress(0);
    
    try {
      const newResults: ThumbnailResult[] = [];
      for (let i = 0; i < 3; i++) {
        setLoadingProgress((i / 3) * 100 + 10);
        const url = await generateThumbnailImage(thumbnailData, i);
        newResults.push({
          id: Math.random().toString(36).substr(2, 9),
          imageUrl: url,
          overlayText: thumbnailData.overlayText,
          textSize: 240,
          textY: 50,
          textX: 10,
          textRotation: -4,
          presenterX: 50,
          presenterY: 50,
          presenterZoom: 1.0,
          framing: thumbnailData.framing,
          suggestion: '',
          isRefining: false
        });
      }
      setResults(newResults);
      setLoadingProgress(100);
      setTimeout(() => setStep(5), 500);
    } catch (err: any) {
      if (err.message && err.message.includes("Quota exceeded")) {
        alert("Cota de uso excedida. Certifique-se de usar uma chave de API de um projeto com faturamento ativado.");
      } else if (err.message && err.message.includes("Requested entity was not found")) {
        // Reset key selection as per instructions
        setHasApiKey(false);
        alert("Sua chave de API expirou ou é inválida. Por favor, selecione-a novamente.");
      } else {
        alert("Erro na geração. Verifique sua conexão ou cota de API.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefineSlot = async (index: number) => {
    const slot = results[index];
    const updated = [...results];
    updated[index].isRefining = true;
    setResults(updated);

    try {
      const newUrl = await refineThumbnailImage(slot, thumbnailData.accentColor);
      const refined = [...results];
      refined[index] = { ...refined[index], imageUrl: newUrl, isRefining: false, suggestion: '' };
      setResults(refined);
    } catch (err: any) {
      const failed = [...results];
      failed[index].isRefining = false;
      setResults(failed);
      alert("Erro ao refinar imagem. Verifique sua cota.");
    }
  };

  const drawOnCanvas = (result: ThumbnailResult): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        canvas.width = 1920; canvas.height = 1080;
        ctx.save();
        
        const zoom = result.presenterZoom;
        const translateX = ((result.presenterX - 50) / 100) * 1920;
        const translateY = ((result.presenterY - 50) / 100) * 1080;
        
        ctx.translate(1920/2, 1080/2);
        ctx.scale(zoom, zoom);
        ctx.translate(-1920/2 + translateX / zoom, -1080/2 + translateY / zoom);
        
        ctx.drawImage(img, 0, 0, 1920, 1080);
        ctx.restore();

        const grad = ctx.createLinearGradient(0, 0, 1500, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0.9)'); 
        grad.addColorStop(0.35, 'rgba(0,0,0,0.6)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.1)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; 
        ctx.fillRect(0, 0, 1920, 1080);

        const lines = result.overlayText.split('\n').filter(l => l.trim().length > 0);
        const startX = (result.textX / 100) * 1920;
        const startY = (result.textY / 100) * 1080;
        ctx.font = `italic 700 ${result.textSize}px "Bebas Neue"`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        
        lines.forEach((line, idx) => {
          ctx.save();
          const spacing = result.textSize * 0.9;
          const yPos = startY + (idx - (lines.length - 1) / 2) * spacing;
          ctx.translate(startX + idx * 15, yPos);
          ctx.rotate(result.textRotation * (Math.PI / 180));
          
          ctx.shadowColor = 'rgba(0,0,0,0.9)'; 
          ctx.shadowBlur = 40;
          ctx.strokeStyle = 'black'; 
          ctx.lineWidth = 25; 
          ctx.lineJoin = 'round';
          ctx.strokeText(line, 8, 8); 
          
          ctx.fillStyle = idx % 2 === 0 ? 'white' : '#FFE200'; 
          ctx.fillText(line, 0, 0);
          ctx.restore();
        });

        canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/png', 1.0);
      };
      img.src = result.imageUrl;
    });
  };

  const downloadImage = async (index: number) => {
    const blob = await drawOnCanvas(results[index]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `thumbmaster-art-${results[index].id}.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    setIsZipping(true);
    const zip = new JSZip();
    const finalSuffix = zipSuffix.trim() || 'pack';
    
    try {
      for (let i = 0; i < results.length; i++) {
        const blob = await drawOnCanvas(results[i]);
        zip.file(`thumbmaster-${finalSuffix}-${i + 1}.png`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.download = `thumbmaster-${finalSuffix}.zip`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erro ao gerar ZIP.");
    } finally {
      setIsZipping(false);
    }
  };

  const renderStep = () => {
    // API Key Selection Step - Mandatory before accessing the main app
    if (hasApiKey !== true) {
      if (hasApiKey === null) return null; // Wait for initial check to complete
      return (
        <div className="flex flex-col items-center text-center space-y-12 py-32 animate-in fade-in zoom-in duration-500">
          <div className="space-y-6 max-w-2xl px-4">
            <h2 className="text-5xl font-bebas uppercase tracking-widest text-white leading-tight">Configuração Necessária</h2>
            <p className="text-zinc-400 text-xl font-medium leading-relaxed">
              Para utilizar o renderizador profissional 8K sem limites de cota, você deve selecionar uma chave de API de um projeto com faturamento ativado.
            </p>
            <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800 text-zinc-500 text-xs text-left">
               <p>Ao selecionar uma chave paga, você evita o erro de <strong>RESOURCE_EXHAUSTED</strong> e garante a melhor qualidade de imagem.</p>
               <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mt-4 block font-bold uppercase tracking-widest">Ver Documentação de Faturamento</a>
            </div>
          </div>
          <Button size="lg" onClick={handleOpenKeyDialog} className="h-20 px-20 text-2xl uppercase font-bebas tracking-widest shadow-blue-600/20 shadow-2xl rounded-full">Configurar Chave de API</Button>
        </div>
      );
    }

    switch (step) {
      case 0: return (
        <div className="flex flex-col items-center text-center space-y-12 py-32 animate-in fade-in zoom-in duration-500">
          <div className="space-y-4">
            <p className="text-zinc-400 max-w-lg text-2xl font-medium mx-auto px-4 leading-relaxed">
              Crie artes virais de alto impacto com iluminação profissional em segundos.
            </p>
          </div>
          <Button size="lg" onClick={handleNext} className="h-20 px-20 text-2xl uppercase font-bebas tracking-widest shadow-blue-600/20 shadow-2xl rounded-full">Iniciar Estúdio</Button>
        </div>
      );

      case 1: return (
        <div className="space-y-8 max-w-xl mx-auto animate-in slide-in-from-right-8 duration-300">
          <div className="text-center">
            <h2 className="text-4xl font-bebas uppercase tracking-widest text-white">1. Rosto & Enquadramento</h2>
            <p className="text-zinc-500 text-[10px] font-black uppercase mt-2">Escolha a perspectiva perfeita da câmera</p>
          </div>
          <div className="space-y-6">
            <div onClick={() => (document.getElementById('file-up') as any).click()} className={`w-full aspect-video border-2 border-dashed rounded-[2.5rem] flex items-center justify-center cursor-pointer transition-all hover:bg-zinc-900/80 group overflow-hidden ${thumbnailData.talentImage ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-800 bg-zinc-900/50'}`}>
              {thumbnailData.talentImage ? (
                <img src={thumbnailData.talentImage} className="w-full h-full object-contain p-6 transition-transform group-hover:scale-105" alt="Talent" />
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto transition-colors group-hover:bg-zinc-700">
                    <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <span className="text-zinc-600 font-black uppercase tracking-widest text-[10px]">Importar Foto do Apresentador</span>
                </div>
              )}
              <input id="file-up" type="file" className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]; if (file) {
                  const r = new FileReader(); r.onload = () => setThumbnailData({...thumbnailData, talentImage: r.result as string, talentImageMimeType: file.type}); r.readAsDataURL(file);
                }
              }} />
            </div>
            <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800 space-y-4 shadow-xl">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Estilo de Enquadramento (Rollout)</label>
              <div className="relative group">
                <select 
                  className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-2xl p-4 text-white font-bold appearance-none cursor-pointer focus:border-blue-500 outline-none transition-all"
                  value={thumbnailData.framing}
                  onChange={(e) => setThumbnailData({...thumbnailData, framing: e.target.value})}
                >
                  {FRAMING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-4"><Button variant="secondary" className="flex-1 h-16 rounded-2xl" onClick={handlePrev}>Voltar</Button><Button className="flex-1 h-16 rounded-2xl text-xl font-bebas tracking-widest" disabled={!thumbnailData.talentImage} onClick={handleNext}>Confirmar Estilo</Button></div>
        </div>
      );

      case 2: return (
        <div className="space-y-6 max-w-xl mx-auto animate-in slide-in-from-right-8 duration-300">
          <div className="text-center"><h2 className="text-4xl font-bebas uppercase tracking-widest text-white">2. Expressão</h2><p className="text-zinc-500 text-[10px] font-black uppercase mt-2">Escolha a reação viral</p></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {EMOTIONS.map(e => (
              <button key={e} onClick={() => setThumbnailData({...thumbnailData, emotion: e})} className={`p-5 rounded-2xl border-2 font-black uppercase transition-all text-xs tracking-widest ${thumbnailData.emotion === e ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-500/20' : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}>{e}</button>
            ))}
          </div>
          <div className="flex justify-between gap-4 pt-4"><Button variant="secondary" className="flex-1 h-16 rounded-2xl" onClick={handlePrev}>Voltar</Button><Button className="flex-1 h-16 rounded-2xl text-xl font-bebas tracking-widest" onClick={handleNext}>Continuar</Button></div>
        </div>
      );

      case 3: return (
        <div className="space-y-6 max-w-xl mx-auto animate-in slide-in-from-right-8 duration-300">
          <div className="text-center"><h2 className="text-4xl font-bebas uppercase tracking-widest text-white">3. Título de Impacto</h2><p className="text-zinc-500 text-[10px] font-black uppercase mt-2">Pense no CTR do seu vídeo</p></div>
          <textarea className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-[2.5rem] p-10 text-white text-5xl font-bebas tracking-widest h-64 resize-none focus:border-blue-600 outline-none shadow-2xl" placeholder="SEU TÍTULO&#10;MASTER" value={thumbnailData.overlayText} onChange={(e) => setThumbnailData({...thumbnailData, overlayText: e.target.value.toUpperCase()})} />
          <div className="flex justify-between gap-4 pt-4"><Button variant="secondary" className="flex-1 h-16 rounded-2xl" onClick={handlePrev}>Voltar</Button><Button className="flex-1 h-16 rounded-2xl text-xl font-bebas tracking-widest" disabled={!thumbnailData.overlayText.trim()} onClick={handleNext}>Estilizar Arte</Button></div>
        </div>
      );

      case 4: return (
        <div className="space-y-10 max-w-xl mx-auto animate-in slide-in-from-right-8 duration-300">
          <div className="text-center"><h2 className="text-4xl font-bebas uppercase tracking-widest text-white">4. Luz e Cenário</h2><p className="text-zinc-500 text-[10px] font-black uppercase mt-2">Configurações de iluminação 8K</p></div>
          <div className="space-y-4 p-8 bg-zinc-900/50 rounded-[2.5rem] border border-zinc-800">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1 mb-4">Cor das Luzes</label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {PRESET_COLORS.map(c => (
                <button key={c.value} onClick={() => setThumbnailData({...thumbnailData, accentColor: c.value})} className={`aspect-square rounded-2xl border-4 transition-all ${thumbnailData.accentColor === c.value ? 'border-white scale-110 shadow-[0_0_20px] shadow-white/20' : 'border-transparent opacity-40 hover:opacity-100'}`} style={{backgroundColor: c.value}} />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Diretivas de Cenário (Tema)</label>
            <textarea className="w-full h-40 bg-zinc-900 border-2 border-zinc-800 rounded-[2.5rem] p-8 text-white focus:border-blue-600 outline-none shadow-inner" placeholder="Ex: Laboratório futurista com fumaça e faíscas azuis, profundidade de campo rasa..." value={thumbnailData.theme} onChange={(e) => setThumbnailData({...thumbnailData, theme: e.target.value})} />
          </div>
          {loading ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 shadow-inner"><div className="h-full bg-blue-600 transition-all duration-700 shadow-[0_0_20px_rgba(37,99,235,0.7)]" style={{width: `${loadingProgress}%`}} /></div>
              <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.5em] animate-pulse">Iniciando Renderização Cinematográfica...</p>
            </div>
          ) : (
            <div className="flex justify-between gap-4"><Button variant="secondary" className="flex-1 h-16 rounded-2xl" onClick={handlePrev}>Voltar</Button><Button className="flex-1 h-20 rounded-2xl text-2xl font-bebas tracking-widest shadow-blue-600/30 shadow-2xl" onClick={handleGenerate} disabled={!thumbnailData.theme}>Gerar 3 Versões</Button></div>
          )}
        </div>
      );

      case 5: return (
        <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="text-center space-y-4">
            <h2 className="text-7xl font-bebas uppercase text-white tracking-widest leading-none">Ajuste Final</h2>
            <p className="text-zinc-500 text-lg max-w-2xl mx-auto">Configure a posição do texto e use o refinamento da IA para detalhes da imagem.</p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start">
            {results.map((res, idx) => (
              <ThumbnailEditor 
                key={res.id} 
                result={res} 
                accentColor={thumbnailData.accentColor}
                onUpdate={(up) => {
                  const n = [...results]; n[idx] = {...n[idx], ...up}; setResults(n);
                }}
                onRefine={() => handleRefineSlot(idx)}
                onDownload={() => downloadImage(idx)}
              />
            ))}
          </div>
          <div className="flex flex-col items-center gap-10 border-t border-zinc-800 pt-20">
            <div className="w-full max-w-xl space-y-6 text-center">
              <div className="flex flex-col gap-3 text-left">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Sufixo do Arquivo Final</label>
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Ex: tutorial-novo"
                    className="flex-grow bg-zinc-900 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-blue-600 outline-none shadow-inner text-xl font-medium"
                    value={zipSuffix}
                    onChange={(e) => setZipSuffix(e.target.value)}
                  />
                </div>
              </div>
              <Button size="lg" className="w-full h-24 text-4xl shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)] font-bebas tracking-[0.15em] uppercase italic transition-all hover:scale-[1.02] active:scale-[0.98] rounded-[2.5rem]" onClick={downloadAllAsZip} isLoading={isZipping}>
                {!isZipping && <span className="mr-4 text-3xl">📦</span>}
                Baixar todas as imagens
              </Button>
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em] opacity-60">Fidelidade Master 1920x1080p | PNG 32-bit</p>
            </div>
            <button onClick={reset} className="text-zinc-600 hover:text-white transition-all uppercase text-[10px] font-black tracking-[0.8em] hover:tracking-[0.9em] border-b border-zinc-800/40 pb-2">Reiniciar Projeto</button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 md:px-12 lg:px-20 max-w-[1800px] mx-auto selection:bg-blue-600 selection:text-white">
      <header className="py-12 flex justify-between items-center border-b border-zinc-800/20">
        <div className="flex flex-col cursor-pointer group" onClick={reset}>
          <span className="font-bebas text-4xl md:text-6xl uppercase block leading-none tracking-tight">Thumbmaster <span className="text-blue-600">ART</span></span>
          <span className="text-[10px] font-black text-blue-500/40 uppercase tracking-[0.8em] block mt-2">Professional AI Studio</span>
        </div>
        <div className="hidden md:flex flex-col items-end space-y-2">
          <div className="flex items-center space-x-4">
             <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_12px_rgba(59,130,246,1)]"></div>
             <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.6em]">Gemini 3 Pro High Fidelity Rendering</span>
          </div>
          <span className="text-[9px] font-bold text-zinc-800 uppercase tracking-[0.4em]">1920x1080 MASTER MODE</span>
        </div>
      </header>
      <main className="flex-grow py-12">{renderStep()}</main>
      <footer className="py-16 border-t border-zinc-800/10 flex flex-col md:flex-row justify-between items-center text-zinc-800 text-[10px] font-black uppercase tracking-[0.5em] gap-8">
        <div className="flex items-center space-x-6">
           <span className="opacity-40">Pro YouTube Workflow</span>
           <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
           <span className="opacity-40">Thumbmaster ART © {new Date().getFullYear()}</span>
        </div>
        <div className="flex space-x-12">
           <a href="#" className="hover:text-blue-500 transition-colors opacity-60 hover:opacity-100">Galeria</a>
           <a href="#" className="hover:text-blue-500 transition-colors opacity-60 hover:opacity-100">Termos</a>
           <a href="#" className="hover:text-blue-500 transition-colors opacity-60 hover:opacity-100">Suporte</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
