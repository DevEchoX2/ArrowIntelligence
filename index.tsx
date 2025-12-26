
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { geminiService } from './backend';

// --- Type definitions for AI Studio global ---
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
    webkitAudioContext: typeof AudioContext;
  }
}

// --- Diagnostic Helpers ---
const parseNeuralError = (err: any) => {
  const defaultMsg = "An unexpected neural glitch occurred. Re-establishing link...";
  const advice: Record<number, string> = {
    429: "Neural throughput exhausted. Rate limit hit.",
    401: "Uplink rejected. Invalid API key.",
    403: "Permission denied. Check billing.",
    503: "Service overloaded.",
  };

  try {
    let errorData = err;
    if (err instanceof Error) {
      try { errorData = JSON.parse(err.message); } catch {
        if (err.message.includes("429")) return { code: 429, message: advice[429], detail: "Quota" };
        return { code: 0, message: err.message || defaultMsg, detail: "Fault" };
      }
    }
    const code = errorData?.error?.code || errorData?.code || 0;
    const rawMessage = errorData?.error?.message || errorData?.message || "";
    return {
      code,
      message: advice[code] || rawMessage || defaultMsg,
      detail: rawMessage ? String(rawMessage).split('\n')[0] : "Standard"
    };
  } catch {
    return { code: 0, message: defaultMsg, detail: "Unknown" };
  }
};

// --- Icons ---
const Icons = {
  Plus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>,
  Sidebar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>,
  Send: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
  Logo: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  Phone: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Sun: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  Moon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
  Image: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Sparkles: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z"/></svg>,
  X: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>,
  Camera: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Alert: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>,
  Mic: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
};

// --- Helpers ---
function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.readAsDataURL(blob);
  });
};

const CodeBlock = ({ className, children }: { className?: string, children?: any }) => {
  const [copied, setCopied] = useState(false);
  const code = String(children || '').replace(/\n$/, '');
  const language = className ? className.replace(/language-/, '') : '';
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-6 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--code-bg)] group/code">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-[var(--border)]">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{language || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-[var(--primary)] transition-colors">
          {copied ? <><Icons.Check /> COPIED!</> : <><Icons.Copy /> COPY CODE</>}
        </button>
      </div>
      <pre className="m-0 border-none rounded-none bg-transparent">
        <code className="text-sm p-4 block overflow-x-auto custom-scroll">{code}</code>
      </pre>
    </div>
  );
};

const SignalFaultMessage = ({ error, onRetry }: { error: any, onRetry: () => void }) => {
  return (
    <div className="mt-4 p-5 rounded-2xl border border-red-500/30 bg-red-500/5 animate-pulse-slow">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-red-500/20 rounded-lg text-red-500"><Icons.Alert /></div>
        <div className="flex-1 space-y-2">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Signal Jammed</h4>
          <p className="text-sm font-medium leading-relaxed">{error.message}</p>
          <div className="pt-2 flex items-center gap-4">
            <button onClick={onRetry} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Retry</button>
            <span className="text-[9px] font-black uppercase tracking-widest text-red-500/50">Error: {error.code || 'X'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [sessions, setSessions] = useState<any[]>(() => JSON.parse(localStorage.getItem('arrow_v8_sessions') || '[]'));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isTyping, setIsTyping] = useState(false);
  const [callMode, setCallMode] = useState<'none' | 'voice'>('none');
  const [voiceName, setVoiceName] = useState(localStorage.getItem('arrow_v8_voice') || 'Zephyr');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isCamEnabled, setIsCamEnabled] = useState(false);
  const [driftTangents, setDriftTangents] = useState<string[]>([]);
  const [transcriptionHistory, setTranscriptionHistory] = useState<{role: 'user'|'ai', text: string}[]>([]);
  
  const [userPfp, setUserPfp] = useState(localStorage.getItem('arrow_v8_user_pfp') || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Operator');
  const [botPfp, setBotPfp] = useState(localStorage.getItem('arrow_v8_bot_pfp') || 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Arrow');

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionPromiseRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  
  const currentInRef = useRef('');
  const currentOutRef = useRef('');

  useEffect(() => {
    localStorage.setItem('arrow_v8_sessions', JSON.stringify(sessions));
    if (activeId && !isTyping) {
      const active = sessions.find(s => s.id === activeId);
      if (active && active.messages.length > 0) {
        const lastFew = active.messages.slice(-3).map((m: any) => m.content).join(" ");
        geminiService.generateDrift(lastFew).then(setDriftTangents);
      }
    }
  }, [sessions, activeId, isTyping]);

  useEffect(() => { document.body.className = isDarkMode ? 'dark' : 'light'; }, [isDarkMode]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [sessions, transcriptionHistory]);

  const handleSend = async (forcedText?: string, type: 'text' | 'image' | 'video' = 'text') => {
    const text = forcedText || input;
    if (!text.trim() || isTyping) return;
    
    if (type === 'video') {
      if (!(await window.aistudio?.hasSelectedApiKey())) await window.aistudio?.openSelectKey();
    }

    const sid = activeId || Date.now().toString();
    const userMsg = { role: 'user', content: text, id: Date.now(), type };
    const aiMsg = { role: 'assistant', content: '', id: Date.now() + 1, isTyping: true, type, error: null };

    if (!activeId) {
      setSessions([{ id: sid, title: text.slice(0, 35), messages: [userMsg, aiMsg] }, ...sessions]);
      setActiveId(sid);
    } else {
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, userMsg, aiMsg] } : s));
    }

    setInput('');
    setIsTyping(true);

    try {
      if (type === 'image') {
        const url = await geminiService.generateImage(text);
        setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: s.messages.map(m => m.id === aiMsg.id ? { ...m, content: 'Neural visual synth complete.', imageUrl: url, isTyping: false } : m) } : s));
      } else if (type === 'video') {
        const url = await geminiService.generateVideo(text);
        setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: s.messages.map(m => m.id === aiMsg.id ? { ...m, content: 'Temporal stream generated.', videoUrl: url, isTyping: false } : m) } : s));
      } else {
        const active = sessions.find(s => s.id === sid);
        const history = (active?.messages || []).filter(m => !m.error).map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        const stream = geminiService.streamChat('gemini-3-flash-preview', text, history);
        let full = '';
        for await (const chunk of stream) {
          full += (chunk as any).text || '';
          setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: s.messages.map(m => m.id === aiMsg.id ? { ...m, content: full } : m) } : s));
        }
        setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: s.messages.map(m => m.id === aiMsg.id ? { ...m, isTyping: false } : m) } : s));
      }
    } catch (e: any) {
      const parsed = parseNeuralError(e);
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: s.messages.map(m => m.id === aiMsg.id ? { ...m, error: parsed, isTyping: false } : m) } : s));
    } finally { setIsTyping(false); }
  };

  const startCall = async () => {
    try {
      setTranscriptionHistory([]);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isCamEnabled });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      const inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      nextStartTimeRef.current = 0;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const audioSource = inputCtx.createMediaStreamSource(mediaStream);
            const scriptNode = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptNode.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            audioSource.connect(scriptNode);
            scriptNode.connect(inputCtx.destination);
            if (isCamEnabled && localVideoRef.current) {
              localVideoRef.current.srcObject = mediaStream;
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              frameIntervalRef.current = window.setInterval(() => {
                if (localVideoRef.current && ctx) {
                  canvas.width = localVideoRef.current.videoWidth;
                  canvas.height = localVideoRef.current.videoHeight;
                  ctx.drawImage(localVideoRef.current, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob(async (blob) => { if (blob) sessionPromise.then(s => blobToBase64(blob).then(b => s.sendRealtimeInput({ media: { data: b, mimeType: 'image/jpeg' } }))); }, 'image/jpeg', 0.4);
                }
              }, 600);
            }
            setCallMode('voice');
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) {
              currentOutRef.current += msg.serverContent.outputTranscription.text;
              setTranscriptionHistory(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'ai') return [...prev.slice(0, -1), { role: 'ai', text: currentOutRef.current }];
                return [...prev, { role: 'ai', text: currentOutRef.current }];
              });
            }
            if (msg.serverContent?.inputTranscription) {
              currentInRef.current += msg.serverContent.inputTranscription.text;
              setTranscriptionHistory(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user') return [...prev.slice(0, -1), { role: 'user', text: currentInRef.current }];
                return [...prev, { role: 'user', text: currentInRef.current }];
              });
            }
            if (msg.serverContent?.turnComplete) {
              currentInRef.current = '';
              currentOutRef.current = '';
            }

            const data = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (data && audioContextRef.current) {
              setIsAiSpeaking(true);
              const buffer = await decodeAudioData(decode(data), audioContextRef.current, 24000, 1);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current.destination);
              const now = audioContextRef.current.currentTime;
              const playTime = Math.max(now, nextStartTimeRef.current);
              source.start(playTime);
              nextStartTimeRef.current = playTime + buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAiSpeaking(false);
              };
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAiSpeaking(false);
            }
          },
          onclose: () => { 
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
            setCallMode('none'); 
            setIsAiSpeaking(false); 
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } } },
          systemInstruction: "You are ArrowIntelligence, a high-fidelity neural interface. Be conversational and concise. You can see through my camera if it is enabled."
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (e) { alert(`Fault: ${parseNeuralError(e).message}`); }
  };

  const endCall = () => {
    sessionPromiseRef.current?.then((s: any) => s.close());
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    setCallMode('none');
  };

  const activeSession = sessions.find(s => s.id === activeId);

  return (
    <div className="flex w-full h-full relative overflow-hidden">
      {/* Sidebar */}
      <aside className={`sidebar-transition fixed md:relative z-40 bg-[var(--bg-sidebar)] border-r border-[var(--border)] h-full flex flex-col ${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden'}`}>
        <div className="p-4 flex flex-col h-full w-72">
          <button onClick={() => { setActiveId(null); setInput(''); }} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-main)] transition-all font-bold text-sm mb-6 active:scale-95">
            <Icons.Plus /> New Neural Signal
          </button>
          <div className="flex-1 overflow-y-auto custom-scroll space-y-1">
            <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest px-3 mb-3">Memory Registry</p>
            {sessions.map(s => (
              <button key={s.id} onClick={() => setActiveId(s.id)} className={`w-full p-3 rounded-xl text-left text-sm truncate transition-all ${activeId === s.id ? 'bg-[var(--bg-main)] text-[var(--primary)] font-bold' : 'hover:bg-[var(--bg-main)] text-[var(--text-muted)]'}`}>
                {s.title || 'Untitled Stream'}
              </button>
            ))}
          </div>
          <div className="mt-auto pt-4 border-t border-[var(--border)] flex flex-col gap-3">
             <div className="flex items-center gap-3">
                <img src={userPfp} onClick={() => { const u = prompt('User Avatar:'); if(u) setUserPfp(u); }} className="w-10 h-10 rounded-full border border-[var(--border)] cursor-pointer hover:ring-2 ring-[var(--primary)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">Operator</p>
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[10px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--primary)]">{isDarkMode ? 'LIGHT MODE' : 'DARK MODE'}</button>
                </div>
             </div>
             <p className="text-[10px] text-[var(--text-muted)] font-black">CREATED BY <span className="text-[var(--primary)]">devvyE_yo</span></p>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col bg-[var(--bg-main)] relative min-w-0 h-full">
        <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--border)] z-20 bg-[var(--bg-main)]/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg"><Icons.Sidebar /></button>
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-[var(--text-muted)]"><Icons.Logo /> ArrowIntelligence</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsCamEnabled(!isCamEnabled)} className={`p-2 rounded-lg transition-all ${isCamEnabled ? 'text-[var(--primary)] bg-[var(--primary-glow)] shadow-[0_0_15px_rgba(16,163,127,0.3)]' : 'text-[var(--text-muted)] hover:bg-white/5'}`}><Icons.Camera /></button>
            <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)} className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border border-[var(--border)] rounded-lg px-2 py-1">
               {['Zephyr','Puck','Kore','Fenrir','Charon'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <button onClick={startCall} className="p-2.5 bg-[var(--primary)] text-white rounded-lg hover:shadow-lg active:scale-95 transition-all"><Icons.Phone /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scroll px-4">
          <div className="max-w-3xl mx-auto py-12 space-y-10">
            {(!activeSession || activeSession.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center pt-24 text-center space-y-8">
                <div className="w-20 h-20 rounded-[2.5rem] bg-[var(--primary)] flex items-center justify-center shadow-2xl shadow-[var(--primary-glow)] animate-pulse"><Icons.Logo /></div>
                <h1 className="text-4xl font-black tracking-tight text-glow">How can I assist?</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {["Analyze neural pathways", "Synth cinematic sequence", "Quantum decryption test", "Logic stream audit"].map(p => (
                    <button key={p} onClick={() => setInput(p)} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-xs text-left hover:border-[var(--primary)] transition-all font-bold group">
                      {p} <span className="opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              activeSession.messages.map((m: any) => (
                <div key={m.id} className={`flex gap-6 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in duration-300`}>
                  <img src={m.role === 'user' ? userPfp : botPfp} className="w-10 h-10 rounded-full border border-[var(--border)] shrink-0" />
                  <div className={m.role === 'user' ? 'message-user' : 'message-ai'}>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {m.error ? <SignalFaultMessage error={m.error} onRetry={() => handleSend(activeSession.messages.findLast(x=>x.role==='user')?.content)} /> : (
                        <ReactMarkdown components={{ code: CodeBlock }}>{m.content}</ReactMarkdown>
                      )}
                      {m.imageUrl && <img src={m.imageUrl} className="mt-4 rounded-2xl w-full border border-[var(--border)] shadow-xl" />}
                      {m.videoUrl && <video controls autoPlay loop className="mt-4 rounded-2xl w-full border border-[var(--border)] bg-black"><source src={m.videoUrl} type="video/mp4" /></video>}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={scrollRef} className="h-24" />
          </div>
        </div>

        <div className="p-6 md:p-10 pt-2 bg-gradient-to-t from-[var(--bg-main)] to-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="input-dock flex items-end p-2 px-4 gap-2">
              <button onClick={() => handleSend(undefined, 'image')} className="p-3 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"><Icons.Image /></button>
              <button onClick={() => handleSend(undefined, 'video')} className="p-3 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"><Icons.Sparkles /></button>
              <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Transmit neural query..." className="flex-1 bg-transparent border-none outline-none resize-none py-3.5 text-[15px] placeholder:text-[var(--text-muted)] font-medium" />
              <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className={`p-3 rounded-xl mb-1 transition-all ${input.trim() ? 'bg-[var(--primary)] text-white shadow-lg active:scale-95' : 'text-[var(--text-muted)] opacity-20'}`}><Icons.Send /></button>
            </div>
            <p className="text-center text-[9px] text-[var(--text-muted)] mt-4 uppercase tracking-[0.2em] font-black">Neural Link v8.6 | Immersive Intercom Engine</p>
          </div>
        </div>

        {/* --- IMMERSIVE VOICE CHAT OVERLAY --- */}
        {callMode === 'voice' && (
          <div className="absolute inset-0 z-[100] bg-[#020202] flex flex-col items-center justify-between p-12 overflow-hidden animate-in fade-in zoom-in duration-500">
             {/* Background Atmosphere */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] transition-all duration-[2000ms] ${isAiSpeaking ? 'bg-[var(--primary)] scale-110' : 'bg-blue-600/30 scale-90'}`}></div>
             </div>

             {/* Header */}
             <div className="w-full flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                   <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50">Neural Link Active</span>
                </div>
                <button onClick={() => setIsCamEnabled(!isCamEnabled)} className="p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all"><Icons.Camera /></button>
             </div>

             {/* Neural Orb Visualizer */}
             <div className="relative flex flex-col items-center justify-center flex-1 w-full gap-8 z-10">
                <div className="relative w-64 h-64 flex items-center justify-center">
                   {/* Reactive Rings */}
                   <div className={`absolute inset-0 border-[3px] border-[var(--primary)] rounded-full transition-all duration-300 ${isAiSpeaking ? 'animate-ping opacity-20 scale-150' : 'opacity-10 scale-100'}`}></div>
                   <div className={`absolute inset-0 border border-white/20 rounded-full animate-[spin_10s_linear_infinite] ${isAiSpeaking ? 'scale-110' : 'scale-100'}`}></div>
                   
                   {/* The Orb / Video */}
                   <div className={`relative w-48 h-48 rounded-[3.5rem] bg-black border-4 border-[var(--primary)] overflow-hidden shadow-[0_0_50px_var(--primary-glow)] transition-all duration-700 ${isAiSpeaking ? 'scale-110' : 'scale-100'}`}>
                      {isCamEnabled ? (
                         <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale brightness-125 contrast-125" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#111] to-black">
                            <Icons.Logo />
                         </div>
                      )}
                      {isAiSpeaking && (
                         <div className="absolute inset-0 bg-[var(--primary)]/10 flex items-center justify-center">
                            <div className="flex items-end gap-1 h-12">
                               {[...Array(6)].map((_,i) => <div key={i} className="wave-bar" style={{ animationDelay: `${i*0.1}s`, width: '4px' }}></div>)}
                            </div>
                         </div>
                      )}
                   </div>
                </div>

                {/* State Label */}
                <div className="text-center space-y-2">
                   <h2 className={`text-4xl font-black tracking-tight text-white uppercase transition-all duration-500 ${isAiSpeaking ? 'scale-110' : 'scale-100 opacity-80'}`}>
                      {isAiSpeaking ? 'ARROW SIGNAL' : 'LISTENING'}
                   </h2>
                   <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--primary)] animate-pulse">{voiceName} VOICE SYNC</span>
                   </div>
                </div>
             </div>

             {/* Real-time Transcription Screen */}
             <div className="w-full max-w-2xl h-32 overflow-y-auto custom-scroll flex flex-col gap-3 px-6 z-10 mask-fade">
                {transcriptionHistory.map((t, i) => (
                   <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-xs font-bold leading-relaxed ${t.role === 'user' ? 'bg-white/10 text-white border border-white/5' : 'bg-[var(--primary-glow)] text-[var(--primary)] border border-[var(--primary)]/20'}`}>
                         {t.text}
                      </div>
                   </div>
                ))}
                <div ref={scrollRef}></div>
             </div>

             {/* Footer Controls */}
             <div className="w-full flex justify-center items-center gap-12 z-10 pt-8">
                <button className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 transition-all active:scale-90"><Icons.Mic /></button>
                <button onClick={endCall} className="w-20 h-20 rounded-[2.5rem] bg-red-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:bg-red-700 transition-all active:scale-90 hover:scale-105"><Icons.X /></button>
                <button className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 transition-all active:scale-90"><Icons.Sidebar /></button>
             </div>
          </div>
        )}
      </main>

      {/* Right Panel (Drift Tangents) */}
      <aside className="hidden xl:flex w-72 bg-[var(--bg-sidebar)] border-l border-[var(--border)] flex-col p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--primary)] mb-8">Neural Drift</p>
        <div className="space-y-4">
          {driftTangents.map((t, i) => (
            <button key={i} onClick={() => handleSend(t)} className="w-full p-5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border)] text-left hover:border-[var(--primary)] transition-all group active:scale-95">
              <p className="text-[11px] text-[var(--text-muted)] font-bold group-hover:text-white transition-colors">{t}</p>
              <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0">Engage Synapse &rarr;</div>
            </button>
          ))}
          {driftTangents.length === 0 && <div className="p-6 border-2 border-dashed border-[var(--border)] rounded-2xl text-center text-[10px] text-[var(--text-muted)] font-black uppercase opacity-40">Mapping signal trajectories...</div>}
        </div>
      </aside>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
