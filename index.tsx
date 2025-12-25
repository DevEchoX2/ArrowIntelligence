
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { geminiService } from './backend';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

// --- Types ---
interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  attachment?: string;
  isTyping?: boolean;
  images?: string[];
  videos?: string[];
  sources?: { title: string; uri: string }[];
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  mode: 'everyday' | 'coding';
  timestamp: number;
}

// --- Icons ---
const Icons = {
  Plus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>,
  Sidebar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>,
  Send: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
  Logo: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>,
  Trash: ({ width = "16", height = "16" }: { width?: string; height?: string }) => <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  Mic: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  VideoCall: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>,
  Image: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Theme: ({ dark }: { dark: boolean }) => dark 
    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Volume: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
  Brain: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.5 2A5 5 0 0 1 12 7v5H7a5 5 0 0 1-2-9.5V2h4.5z"/><path d="M14.5 2A5 5 0 0 0 12 7v5h5a5 5 0 0 0 2-9.5V2h-4.5z"/><path d="M12 12v7a5 5 0 0 1-5 5H2v-4.5a5 5 0 0 1 9.5-2H12z"/><path d="M12 12v7a5 5 0 0 0 5 5h5v-4.5a5 5 0 0 0-9.5-2H12z"/></svg>
};

const VOICES = [
  { name: 'Kore', gender: 'Female', label: 'Classic Kore' },
  { name: 'Zephyr', gender: 'Female', label: 'Energetic Zephyr' },
  { name: 'Puck', gender: 'Male', label: 'Casual Puck' },
  { name: 'Charon', gender: 'Male', label: 'Deep Charon' },
  { name: 'Fenrir', gender: 'Male', label: 'Bold Fenrir' }
];

const DB_NAME = "arrow_neural_v4_pulse";
const MEMORY_KEY = "arrow_neural_memory";

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const encode = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};

// --- Custom Components ---
const CodeBlock = ({ children, className }: { children: any, className?: string }) => {
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');
  
  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6 rounded-xl overflow-hidden border border-[var(--border-color)] bg-black shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 backdrop-blur-md border-b border-white/10">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{className?.replace('language-', '') || 'code'}</span>
        <button onClick={handleCopy} className="text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors flex items-center gap-2">
          {copied ? 'Copied' : <><Icons.Copy /> Copy</>}
        </button>
      </div>
      <pre className="!m-0 !rounded-none !border-none !bg-transparent p-5 overflow-x-auto font-mono text-sm leading-relaxed text-[#e0e0e0]">
        <code>{children}</code>
      </pre>
    </div>
  );
};

// --- Neural Avatar Call View ---
const NeuralCallView = ({ onClose, voiceName, voiceRate, neuralMemory }: { onClose: () => void, voiceName: string, voiceRate: number, neuralMemory: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Initializing Presence...');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);

  useEffect(() => {
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    inputAudioCtxRef.current = inputCtx;
    outputAudioCtxRef.current = outputCtx;

    const analyzer = outputCtx.createAnalyser();
    analyzer.fftSize = 256;
    analyzerRef.current = analyzer;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('2d');
    if (!gl) return;

    let frame = 0;
    const draw = () => {
      frame++;
      const w = canvas.width = window.innerWidth;
      const h = canvas.height = window.innerHeight;
      gl.clearRect(0, 0, w, h);

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const intensity = avg / 128;
      setIsSpeaking(intensity > 0.1);

      const centerX = w / 2;
      const centerY = h / 2;
      const baseRadius = Math.min(w, h) * 0.12;

      // Transformer Attention Visualizer (Floating Neural Points)
      for (let i = 0; i < 40; i++) {
        const angle = (frame * 0.01 + (i * (Math.PI * 2) / 40));
        const dist = baseRadius * 2 + Math.sin(frame * 0.05 + i) * 20;
        const px = centerX + Math.cos(angle) * dist;
        const py = centerY + Math.sin(angle) * dist;
        
        gl.beginPath();
        gl.arc(px, py, 1 + intensity * 5, 0, Math.PI * 2);
        gl.fillStyle = `rgba(16, 163, 127, ${0.1 + intensity})`;
        gl.fill();
        
        gl.beginPath();
        gl.moveTo(centerX, centerY);
        gl.lineTo(px, py);
        gl.strokeStyle = `rgba(16, 163, 127, ${0.05 * intensity})`;
        gl.stroke();
      }

      gl.beginPath();
      const r = baseRadius + intensity * 30;
      gl.arc(centerX, centerY, r, 0, Math.PI * 2);
      const grad = gl.createRadialGradient(centerX, centerY, 0, centerX, centerY, r);
      grad.addColorStop(0, '#10a37f');
      grad.addColorStop(1, 'rgba(16, 163, 127, 0)');
      gl.fillStyle = grad;
      gl.fill();

      requestAnimationFrame(draw);
    };
    draw();

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();

    const startLive = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              setStatus('Neural Link Synchronized');
              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
                const blob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                sessionPromise.then(s => s.sendRealtimeInput({ media: blob }));
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);
            },
            onmessage: async (m: LiveServerMessage) => {
              const audioB64 = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioB64) {
                nextStartTime = Math.max(nextStartTime, outputCtx.currentTime);
                const buffer = await decodeAudioData(decode(audioB64), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = buffer;
                source.playbackRate.value = voiceRate;
                source.connect(analyzer);
                analyzer.connect(outputCtx.destination);
                source.start(nextStartTime);
                nextStartTime += buffer.duration / voiceRate;
                sources.add(source);
                source.onended = () => sources.delete(source);
              }
              if (m.serverContent?.interrupted) {
                sources.forEach(s => s.stop());
                sources.clear();
                nextStartTime = 0;
              }
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
            systemInstruction: `You are in a video call. Use a persona that is human-like and empathetic. ${neuralMemory ? `MEMORY: ${neuralMemory}` : ""}.`
          }
        });
        liveSessionRef.current = sessionPromise;
      } catch (e) { setStatus('Neural Link Denied: Check Mic'); }
    };
    startLive();

    return () => {
      liveSessionRef.current?.then((s: any) => s.close());
      inputCtx.close();
      outputCtx.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-700">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />
      <div className="relative z-10 flex flex-col items-center gap-10">
        <div className={`ai-avatar w-32 h-32 scale-[2.5] shadow-[0_0_100px_rgba(16,163,127,0.4)] ${isSpeaking ? 'voice-ripple' : ''}`}><Icons.Logo /></div>
        <div className="text-center">
          <h2 className="text-4xl font-black italic tracking-tighter text-white mb-2">ArrowIntelligence</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--accent)] animate-pulse">{status}</p>
        </div>
      </div>
      <div className="absolute bottom-16 flex items-center gap-6">
        <button onClick={onClose} className="px-10 py-5 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl flex items-center gap-3"><Icons.Close /> Terminate Sync</button>
      </div>
    </div>
  );
};

const App = () => {
  const [sessions, setSessions] = useState<Session[]>(() => {
    try { const d = localStorage.getItem(DB_NAME); return d ? JSON.parse(d) : []; } catch(e) { return []; }
  });
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem('arrow_active_id') || null);
  const [neuralMemory, setNeuralMemory] = useState(() => localStorage.getItem(MEMORY_KEY) || "");
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'everyday' | 'coding'>('everyday');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceChat, setIsVoiceChat] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [voiceName, setVoiceName] = useState(() => localStorage.getItem('arrow_voice_name') || 'Kore');
  const [voiceRate, setVoiceRate] = useState(() => Number(localStorage.getItem('arrow_voice_rate')) || 1.0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('arrow_theme') as 'light' | 'dark') || 'dark');
  const [attachedImage, setAttachedImage] = useState<{ data: string, mimeType: string, preview: string } | null>(null);
  const [latency, setLatency] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem(DB_NAME, JSON.stringify(sessions));
    if (activeId) localStorage.setItem('arrow_active_id', activeId);
  }, [sessions, activeId]);

  useEffect(() => { localStorage.setItem(MEMORY_KEY, neuralMemory); }, [neuralMemory]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('arrow_theme', theme);
  }, [theme]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' }); }, [sessions, isTyping]);

  const initAudio = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  };

  const handleCopy = useCallback((text: string) => navigator.clipboard.writeText(text), []);

  const activeSession = sessions.find(s => s.id === activeId);

  const createChat = () => {
    const id = Date.now().toString();
    const newSession: Session = { id, title: 'New Thread', messages: [], mode, timestamp: Date.now() };
    setSessions(prev => [newSession, ...prev]);
    setActiveId(id);
  };

  const handleSpeechRecognition = () => {
    initAudio();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (recognitionRef.current) { recognitionRef.current.stop(); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsVoiceChat(true);
    recognition.onend = () => { setIsVoiceChat(false); recognitionRef.current = null; };
    recognition.onresult = (e: any) => handleAction(e.results[0][0].transcript, true);
    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleAction = async (manualText: string | null = null, voiceTriggered = false) => {
    initAudio();
    const text = (manualText || input).trim();
    if (!text && !attachedImage) return;

    const isVideo = /animate|video|motion/i.test(text);
    const isImage = /generate|create image|render image|picture/i.test(text);

    let targetId = activeId;
    if (!targetId) {
      targetId = Date.now().toString();
      const newSession: Session = { id: targetId, title: text.slice(0, 30), messages: [], mode, timestamp: Date.now() };
      setSessions(prev => [newSession, ...prev]);
      setActiveId(targetId);
    }

    if (!manualText) setInput('');
    const currentImage = attachedImage;
    setAttachedImage(null);
    setIsTyping(true);

    const aiId = Date.now() + 1;
    const aiMsg: Message = { id: aiId, role: 'assistant', content: '', isTyping: true };

    setSessions(prev => prev.map(s => s.id === targetId ? {
      ...s,
      messages: [...s.messages, { id: Date.now(), role: 'user', content: text, attachment: currentImage?.preview }, aiMsg],
      title: s.messages.length === 0 ? text.slice(0, 30) : s.title
    } : s));

    const startTime = Date.now();

    try {
      if (isVideo) {
        const videoUrl = await geminiService.generateVideo(text, currentImage?.data, currentImage?.mimeType);
        setSessions(prev => prev.map(s => s.id === targetId ? {
          ...s,
          messages: s.messages.map(m => m.id === aiId ? { ...m, content: "Neural synthesis finalized.", isTyping: false, videos: [videoUrl] } : m)
        } : s));
      } else if (isImage) {
        const { text: aiText, images } = await geminiService.generateImage(text, currentImage?.data, currentImage?.mimeType);
        setSessions(prev => prev.map(s => s.id === targetId ? {
          ...s,
          messages: s.messages.map(m => m.id === aiId ? { ...m, content: aiText, isTyping: false, images } : m)
        } : s));
      } else {
        const model = mode === 'coding' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
        const history = (sessions.find(s => s.id === targetId)?.messages || [])
          .filter(m => !m.isTyping)
          .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

        const stream = geminiService.streamChat(model, text, history, mode === 'everyday' ? [{ googleSearch: {} }] : [], neuralMemory);
        
        let fullContent = '';
        let sources: any[] = [];

        for await (const chunk of stream) {
          fullContent += (chunk as any).text || "";
          const grounding = (chunk as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (grounding) sources = grounding.map((c: any) => ({ title: c.web?.title, uri: c.web?.uri }));

          setSessions(prev => prev.map(s => s.id === targetId ? {
            ...s,
            messages: s.messages.map(m => m.id === aiId ? { ...m, content: fullContent, sources } : m)
          } : s));
        }

        setSessions(prev => prev.map(s => s.id === targetId ? {
          ...s,
          messages: s.messages.map(m => m.id === aiId ? { ...m, isTyping: false } : m)
        } : s));

        const finalHistory = [...history, { role: 'user', parts: [{ text }] }, { role: 'model', parts: [{ text: fullContent }] }];
        geminiService.extractInsights(finalHistory).then(insights => {
          if (insights) setNeuralMemory(prev => (prev + "\n" + insights).trim());
        });
      }
      setLatency(Date.now() - startTime);
    } catch (e: any) {
      setSessions(prev => prev.map(s => s.id === targetId ? {
        ...s,
        messages: s.messages.map(m => m.id === aiId ? { ...m, content: `Neural Exception: ${e.message}`, isTyping: false } : m)
      } : s));
    } finally { setIsTyping(false); }
  };

  return (
    <div className="flex h-full w-full bg-[var(--sidebar-bg)] overflow-hidden" onClick={initAudio}>
      <aside className={`flex flex-col border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] sidebar-transition z-40 h-full overflow-hidden ${sidebarOpen ? 'w-64' : 'w-0 opacity-0'}`}>
        <div className="p-4 flex-shrink-0">
          <button onClick={createChat} className="flex items-center gap-3 w-full p-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--user-msg-bg)] transition-all text-sm font-semibold bg-[var(--chat-bg)] shadow-sm group">
            <span className="text-[var(--accent)] group-hover:rotate-90 transition-transform duration-300"><Icons.Plus /></span>
            New Thread
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-hide pb-8">
          {sessions.map(s => (
            <div key={s.id} onClick={() => setActiveId(s.id)} className={`group relative flex items-center p-3 rounded-xl cursor-pointer transition-all ${activeId === s.id ? 'bg-[var(--user-msg-bg)]' : 'hover:bg-[var(--user-msg-bg)]/50'}`}>
              <span className={`text-xs truncate pr-8 font-medium ${activeId === s.id ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{s.title || 'Untitled'}</span>
              <button onClick={(e) => { e.stopPropagation(); setSessions(prev => prev.filter(x => x.id !== s.id)); if (activeId === s.id) setActiveId(null); }} className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:scale-110 transition-all"><Icons.Trash width="14" height="14" /></button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--accent)] bg-[var(--accent-glow)] p-3 rounded-xl">
            <Icons.Brain />
            <span>Persona Synced</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative min-w-0 bg-[var(--chat-bg)] h-full overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] z-30 flex-shrink-0 bg-[var(--chat-bg)]/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[var(--user-msg-bg)] rounded-lg text-[var(--text-muted)] transition-colors"><Icons.Sidebar /></button>
            <div className="mode-switch flex">
              <button onClick={() => setMode('everyday')} className={`mode-btn ${mode === 'everyday' ? 'active' : ''}`}>Everyday</button>
              <button onClick={() => setMode('coding')} className={`mode-btn ${mode === 'coding' ? 'active' : ''}`}>Coding</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsVideoCall(true)} className="p-2.5 bg-[var(--accent-glow)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white rounded-xl transition-all shadow-sm"><Icons.VideoCall /></button>
            <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-[var(--user-msg-bg)] rounded-lg text-[var(--text-muted)] transition-colors"><Icons.Settings /></button>
            <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2 hover:bg-[var(--user-msg-bg)] rounded-lg text-[var(--text-muted)] transition-colors"><Icons.Theme dark={theme === 'dark'} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-3xl mx-auto px-6 py-12 min-h-full flex flex-col">
            {!activeId || (activeSession && activeSession.messages.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-1000">
                <div className="ai-avatar w-14 h-14 mb-8 shadow-2xl scale-110"><Icons.Logo /></div>
                <h2 className="text-4xl font-black italic tracking-tighter text-[var(--text-main)] mb-3">ArrowIntelligence</h2>
                <p className="text-[var(--text-muted)] text-[10px] mb-12 opacity-50 uppercase tracking-[0.4em] font-black">Neural Processor v4.0 Active</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                  <button onClick={() => handleAction("Analyze my technical level based on my previous discussions.")} className="p-6 rounded-2xl border border-[var(--border-color)] hover:bg-[var(--user-msg-bg)] text-left transition-all group hover:scale-[1.02] bg-[var(--chat-bg)] shadow-sm">
                    <div className="text-[10px] font-black uppercase mb-1.5 text-[var(--accent)] tracking-widest">Persona Check</div>
                    <div className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-main)] leading-relaxed">Query your long-term neural profile</div>
                  </button>
                  <button onClick={() => setIsVideoCall(true)} className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--accent-glow)]/30 hover:bg-[var(--accent-glow)] text-left transition-all group hover:scale-[1.02] shadow-sm">
                    <div className="text-[10px] font-black uppercase mb-1.5 text-[var(--accent)] tracking-widest">Live Link</div>
                    <div className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-main)] leading-relaxed">Low-latency video interaction</div>
                  </button>
                </div>
              </div>
            ) : activeSession.messages.map(m => (
              <div key={m.id} className={`message-enter flex gap-5 mb-12 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && <div className="ai-avatar mt-1"><Icons.Logo /></div>}
                <div className={`max-w-[85%] group relative ${m.role === 'user' ? 'bg-[var(--user-msg-bg)] px-6 py-4 rounded-2xl border border-[var(--border-color)]' : 'flex-1'}`}>
                  <div className="prose prose-neutral dark:prose-invert max-w-none text-[15px] leading-relaxed font-medium">
                    <ReactMarkdown components={{ code: CodeBlock as any }}>{m.content}</ReactMarkdown>
                    {m.isTyping && !m.content && <div className="flex gap-1.5 items-center mt-3 h-4"><div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div><div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div></div>}
                  </div>
                  {m.images?.map((img, idx) => <img key={idx} src={img} className="generated-media" />)}
                  {m.videos?.map((vid, idx) => <video key={idx} src={vid} controls className="generated-media w-full aspect-video shadow-2xl" />)}
                  {m.role === 'assistant' && !m.isTyping && (
                    <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleCopy(m.content)} className="p-1.5 hover:bg-[var(--user-msg-bg)] rounded-md text-[var(--text-muted)] flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest border border-[var(--border-color)] transition-all"><Icons.Copy /> Copy</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </div>

        <div className="pb-8 px-6 flex-shrink-0">
          <div className="input-wrapper">
            {attachedImage && (
              <div className="px-6 pt-4 flex items-center">
                <div className="relative group">
                  <img src={attachedImage.preview} className="w-14 h-14 rounded-xl object-cover border border-[var(--border-color)]" />
                  <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><Icons.Trash width="12" height="12" /></button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 p-3.5 px-5">
              <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"><Icons.Image /></button>
              <textarea rows={1} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAction())} placeholder="Message ArrowIntelligence..." className="flex-1 bg-transparent border-none outline-none resize-none py-2 text-[15px] max-h-60 font-medium text-[var(--text-main)] scrollbar-hide" />
              <div className="flex items-center gap-1.5">
                <button onClick={handleSpeechRecognition} className={`p-3 rounded-xl transition-all ${isVoiceChat ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-[var(--text-muted)] hover:text-[var(--accent)]'}`}><Icons.Mic /></button>
                <button onClick={() => handleAction()} disabled={(!input.trim() && !attachedImage) || isTyping} className="p-3 bg-[var(--text-main)] text-[var(--chat-bg)] rounded-xl disabled:opacity-20 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-lg"><Icons.Send /></button>
              </div>
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => setAttachedImage({ data: (reader.result as string).split(',')[1], mimeType: file.type, preview: reader.result as string });
                  reader.readAsDataURL(file);
                }
              }} accept="image/*" className="hidden" />
            </div>
          </div>
        </div>

        {isVideoCall && <NeuralCallView neuralMemory={neuralMemory} voiceName={voiceName} voiceRate={voiceRate} onClose={() => setIsVideoCall(false)} />}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) createRoot(container).render(<App />);
