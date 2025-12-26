
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
    429: "Neural throughput exhausted. You've hit a rate limit. Please wait a few seconds before retrying.",
    401: "Uplink rejected. Your API key appears to be invalid. Try refreshing or re-selecting your key.",
    403: "Permission denied. Ensure your API key has access to this specific model and billing is active.",
    404: "Neural path not found. The requested model or resource is unavailable.",
    500: "Neural backbone failure. The server encountered an internal error. Try again later.",
    503: "Service overloaded. The engine is busy processing high-priority traffic. Retry shortly.",
  };

  try {
    let errorData = err;
    // Extract message if it's an Error object
    if (err instanceof Error) {
      // Sometimes the message itself is a stringified JSON
      try {
        errorData = JSON.parse(err.message);
      } catch {
        // Not JSON, check for common status strings
        if (err.message.includes("429")) return { code: 429, message: advice[429], detail: "Rate Limit Exceeded" };
        return { code: 0, message: err.message || defaultMsg, detail: "Standard Fault" };
      }
    }

    const code = errorData?.error?.code || errorData?.code || 0;
    const rawMessage = errorData?.error?.message || errorData?.message || "";
    
    // Check for nested Gemini errors
    if (typeof rawMessage === 'string' && rawMessage.startsWith('{')) {
       try {
         const nested = JSON.parse(rawMessage);
         const nestedCode = nested?.error?.code;
         const nestedMsg = nested?.error?.message;
         if (nestedCode) return { 
            code: nestedCode, 
            message: advice[nestedCode] || nestedMsg, 
            detail: nestedMsg 
         };
       } catch {}
    }

    return {
      code,
      message: advice[code] || rawMessage || defaultMsg,
      detail: rawMessage ? String(rawMessage).split('\n')[0] : "Check console for stack trace."
    };
  } catch {
    return { code: 0, message: defaultMsg, detail: "Unknown Error Type" };
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
  X: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>,
  Camera: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Alert: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>,
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

// --- Highlighting Engine ---
const highlightCode = (code: string) => {
  return code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/(\/\/.*)/g, '<span class="token-comment">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="token-string">$1</span>')
    .replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|await|async|try|catch|new|this|throw|break|continue|case|switch|default|delete|in|of|void|yield|do|null|undefined|true|false)\b/g, '<span class="token-keyword">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>')
    .replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span class="token-function">$1</span>')
    .replace(/(\+\+|--|===|!==|==|!=|>=|<=|=>|&&|\|\||[+\-*/%&|^!~=<>])/g, '<span class="token-operator">$1</span>');
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
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
          {language || 'code'}
        </span>
        <button 
          onClick={copy} 
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-[var(--primary)] transition-colors"
        >
          {copied ? <><Icons.Check /> COPIED!</> : <><Icons.Copy /> COPY CODE</>}
        </button>
      </div>
      <pre className="m-0 border-none rounded-none bg-transparent">
        <code dangerouslySetInnerHTML={{ __html: highlightCode(code) }} />
      </pre>
    </div>
  );
};

// --- Specialized Error Display ---
const SignalFaultMessage = ({ error, onRetry }: { error: any, onRetry: () => void }) => {
  return (
    <div className="mt-4 p-5 rounded-2xl border border-red-500/30 bg-red-500/5 animate-pulse-slow">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-red-500/20 rounded-lg text-red-500">
          <Icons.Alert />
        </div>
        <div className="flex-1 space-y-2">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Neural Signal Jammed</h4>
          <p className="text-sm font-medium leading-relaxed">{error.message}</p>
          <div className="pt-2 flex items-center gap-4">
            <button 
              onClick={onRetry} 
              className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Retry Signal
            </button>
            <span className="text-[9px] font-black uppercase tracking-widest text-red-500/50">Error: {error.code || 'X'} - {error.detail}</span>
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
  const [userPfp, setUserPfp] = useState(localStorage.getItem('arrow_v8_user_pfp') || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Operator');
  const [botPfp, setBotPfp] = useState(localStorage.getItem('arrow_v8_bot_pfp') || 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Arrow');

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionPromiseRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

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
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [sessions]);

  const handleSend = async (forcedText?: string, type: 'text' | 'image' | 'video' = 'text') => {
    const text = forcedText || input;
    if (!text.trim() || isTyping) return;
    
    if (type === 'video') {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio?.openSelectKey();
      }
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
        setSessions(prev => prev.map(s => s.id === sid ? {
          ...s, messages: s.messages.map(m => m.id === aiMsg.id ? { ...m, content: 'Neural image synthesized.', imageUrl: url, isTyping: false } : m)
        } : s));
      } else if (type === 'video') {
        const url = await geminiService.generateVideo(text);
        setSessions(prev => prev.map(s => s.id === sid ? {
          ...s, messages: s.messages.map(m => m.id === aiMsg.id ? { ...m, content: 'Temporal stream generated with Veo 3.1.', videoUrl: url, isTyping: false } : m)
        } : s));
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
      if (parsed.code === 401 || parsed.code === 404) {
        await window.aistudio?.openSelectKey();
      }
      setSessions(prev => prev.map(s => s.id === sid ? { 
        ...s, 
        messages: s.messages.map(m => m.id === aiMsg.id ? { 
          ...m, 
          error: parsed,
          isTyping: false 
        } : m) 
      } : s));
    } finally { setIsTyping(false); }
  };

  const startCall = async () => {
    try {
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
                  const vw = localVideoRef.current.videoWidth;
                  const vh = localVideoRef.current.videoHeight;
                  if (vw && vh) {
                    canvas.width = vw;
                    canvas.height = vh;
                    ctx.drawImage(localVideoRef.current, 0, 0, vw, vh);
                    canvas.toBlob(async (blob) => {
                      if (blob) {
                        const base64Data = await blobToBase64(blob);
                        sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
                      }
                    }, 'image/jpeg', 0.5);
                  }
                }
              }, 500);
            }

            setCallMode('voice');
          },
          onmessage: async (msg: LiveServerMessage) => {
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
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } } },
          systemInstruction: "You are ArrowIntelligence. You can see through my camera if it's on. Be conversational, direct, and brief. Created by devvyE_yo."
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (e) { 
      const parsed = parseNeuralError(e);
      alert(`Neural Signal Fault: ${parsed.message}`);
    }
  };

  const endCall = () => {
    sessionPromiseRef.current?.then((s: any) => s.close());
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    setCallMode('none');
  };

  const activeSession = sessions.find(s => s.id === activeId);

  return (
    <div className="flex w-full h-full relative">
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
                <img 
                  src={userPfp} 
                  title="Change User PFP"
                  onClick={() => { const u = prompt('User Avatar URL:'); if(u) { setUserPfp(u); localStorage.setItem('arrow_v8_user_pfp',u); } }} 
                  className="w-10 h-10 rounded-full border border-[var(--border)] cursor-pointer hover:ring-2 ring-[var(--primary)] transition-all" 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">Operator</p>
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[10px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                    {isDarkMode ? 'SWITCH LIGHT' : 'SWITCH DARK'}
                  </button>
                </div>
                <div className="p-2 text-[var(--text-muted)]">
                   {isDarkMode ? <Icons.Moon /> : <Icons.Sun />}
                </div>
             </div>
             <p className="text-[10px] text-[var(--text-muted)] px-1 font-bold">CREATED BY <span className="text-[var(--primary)]">devvyE_yo</span></p>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col bg-[var(--bg-main)] relative min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--border)] z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"><Icons.Sidebar /></button>
            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest text-[var(--text-muted)] select-none">
               <Icons.Logo /> <span className="hidden sm:inline">ArrowIntelligence</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCamEnabled(!isCamEnabled)} 
              className={`p-2 transition-colors rounded-lg flex items-center gap-2 ${isCamEnabled ? 'text-[var(--primary)] bg-[var(--primary-glow)]' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
              title="Toggle Camera for Live Call"
            >
              <Icons.Camera />
              <span className="text-[10px] font-black uppercase hidden sm:inline">{isCamEnabled ? 'ON' : 'OFF'}</span>
            </button>
            <select value={voiceName} onChange={(e) => { setVoiceName(e.target.value); localStorage.setItem('arrow_v8_voice', e.target.value); }} className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border border-[var(--border)] rounded-lg px-2 py-1 cursor-pointer">
               {['Zephyr','Puck','Kore','Fenrir','Charon'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <button onClick={startCall} className="p-2 hover:text-[var(--primary)] transition-colors" title="Voice & Vision Stream"><Icons.Phone /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scroll px-4">
          <div className="max-w-3xl mx-auto py-12 space-y-10">
            {(!activeSession || activeSession.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center pt-24 text-center space-y-8 animate-in fade-in duration-700">
                <div className="w-20 h-20 rounded-[2.5rem] bg-[var(--primary)] flex items-center justify-center shadow-2xl shadow-[var(--primary-glow)]"><Icons.Logo /></div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-black tracking-tight">How can I assist?</h1>
                  <p className="text-sm text-[var(--text-muted)] max-w-sm font-medium">Neural engine online. Engage in code synthesis, media generation, or real-time voice & video streaming.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  {["Analyze this React code", "Synth cinematic video clip", "Quantum theory breakdown", "Logical reasoning test"].map(p => (
                    <button key={p} onClick={() => setInput(p)} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-xs text-left hover:border-[var(--primary)] transition-all font-bold group">
                      {p} <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">&rarr;</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              activeSession.messages.map((m: any) => (
                <div key={m.id} className={`flex gap-6 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in duration-300`}>
                  <img 
                    src={m.role === 'user' ? userPfp : botPfp} 
                    title={m.role === 'user' ? 'Operator' : 'Arrow (Click to Change)'}
                    onClick={() => { if(m.role==='assistant'){ const u = prompt('Neural Avatar URL:'); if(u){setBotPfp(u); localStorage.setItem('arrow_v8_bot_pfp',u);}}} } 
                    className={`w-10 h-10 rounded-full border border-[var(--border)] object-cover cursor-pointer hover:ring-2 ring-[var(--primary)] transition-all ${m.role === 'assistant' && isAiSpeaking ? 'ring-2 ring-[var(--primary)] animate-pulse' : ''}`} 
                  />
                  <div className={m.role === 'user' ? 'message-user' : 'message-ai'}>
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-emerald">
                      {m.error ? (
                        <SignalFaultMessage 
                           error={m.error} 
                           onRetry={() => {
                             const lastUserMsg = activeSession.messages.findLast(msg => msg.role === 'user');
                             if (lastUserMsg) handleSend(lastUserMsg.content);
                           }} 
                        />
                      ) : (
                        <ReactMarkdown components={{ 
                          code({ className, children, inline }: any) { 
                            return !inline ? 
                              <CodeBlock className={className}>{children}</CodeBlock> : 
                              <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[var(--primary)] font-bold">{children}</code>; 
                          } 
                        }}>
                          {m.content}
                        </ReactMarkdown>
                      )}
                      {m.imageUrl && <img src={m.imageUrl} className="mt-4 rounded-2xl w-full border border-[var(--border)] shadow-xl animate-in zoom-in-95 duration-500" />}
                      {m.videoUrl && (
                        <div className="mt-4 rounded-2xl overflow-hidden border border-[var(--border)] shadow-xl animate-in zoom-in-95 duration-500 bg-black">
                          <video controls autoPlay loop className="w-full">
                            <source src={m.videoUrl} type="video/mp4" />
                          </video>
                        </div>
                      )}
                      {m.isTyping && !m.content && <div className="flex gap-1.5 mt-4"><div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:0.4s]" /></div>}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={scrollRef} className="h-24" />
          </div>
        </div>

        {/* Input UI */}
        <div className="p-6 md:p-10 pt-2">
          <div className="max-w-3xl mx-auto">
            <div className="input-dock flex items-end p-2 px-4 gap-2">
              <button onClick={() => handleSend(undefined, 'image')} className="p-3 hover:text-[var(--primary)] transition-colors" title="Neural Visual Synth"><Icons.Image /></button>
              <button onClick={() => handleSend(undefined, 'video')} className="p-3 hover:text-[var(--primary)] transition-colors" title="Temporal Stream Synth"><Icons.Sparkles /></button>
              <textarea 
                rows={1} value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'; }}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Message ArrowIntelligence..."
                className="flex-1 bg-transparent border-none outline-none resize-none py-3.5 text-[15px] placeholder:text-[var(--text-muted)] font-medium leading-relaxed"
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className={`p-3 rounded-xl mb-1 transition-all ${input.trim() ? 'bg-[var(--primary)] text-white shadow-lg active:scale-95' : 'text-[var(--text-muted)] opacity-20'}`}><Icons.Send /></button>
            </div>
            <p className="text-center text-[9px] text-[var(--text-muted)] mt-4 uppercase tracking-[0.2em] font-black select-none">Neural Link Prime v8.5 | Advanced Diagnostics</p>
          </div>
        </div>

        {/* Fullscreen Voice/Video Overlay */}
        {callMode === 'voice' && (
          <div className="absolute inset-0 z-[60] glass-effect flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-500">
             <div className="relative flex flex-col items-center gap-6">
                <div className={`relative rounded-full border-4 border-[var(--primary)] overflow-hidden transition-all duration-500 ${isAiSpeaking ? 'scale-105 shadow-[0_0_60px_var(--primary-glow)]' : ''}`}>
                   {isCamEnabled ? (
                      <video ref={localVideoRef} autoPlay muted playsInline className="w-60 h-60 object-cover rounded-full" />
                   ) : (
                      <img src={botPfp} className="w-44 h-44 object-cover" />
                   )}
                   {isCamEnabled && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-4">
                         <span className="text-[10px] font-black text-white uppercase tracking-widest">Neural Vision Active</span>
                      </div>
                   )}
                </div>
                {isAiSpeaking && (
                   <div className="flex items-end h-12">
                      {[...Array(8)].map((_, i) => <div key={i} className="wave-bar" style={{ animationDelay: `${i*0.1}s` }} />)}
                   </div>
                )}
             </div>
             <div className="text-center space-y-3">
                <h3 className="text-3xl font-black tracking-tight text-white uppercase text-glow">Linked</h3>
                <p className={`text-[11px] font-black uppercase tracking-[0.4em] transition-colors ${isAiSpeaking ? 'text-[var(--primary)]' : 'text-white/30'}`}>
                  {isAiSpeaking ? 'RECEIVING SIGNAL' : 'LISTENING FOR SIGNAL'}
                </p>
             </div>
             <div className="flex gap-6">
                <button onClick={endCall} className="w-20 h-20 bg-red-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl hover:bg-red-700 transition-all active:scale-90"><Icons.X /></button>
             </div>
          </div>
        )}
      </main>

      {/* Right Panel (Drift Tangents) */}
      <aside className="hidden xl:flex w-72 bg-[var(--bg-sidebar)] border-l border-[var(--border)] flex-col p-8 space-y-10">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--primary)] mb-8">Neural Drift</p>
          <div className="space-y-5">
            {driftTangents.length === 0 ? (
               <div className="p-6 border-2 border-dashed border-[var(--border)] rounded-2xl text-center text-[10px] text-[var(--text-muted)] font-black italic opacity-40 leading-relaxed uppercase">Mapping cognitive trajectories...</div>
            ) : driftTangents.map((t, i) => (
              <button key={i} onClick={() => handleSend(t)} className="w-full p-5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border)] text-left hover:border-[var(--primary)] transition-all group active:scale-95">
                <p className="text-[11px] text-[var(--text-muted)] font-bold leading-relaxed group-hover:text-[var(--text-main)] transition-colors">{t}</p>
                <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">Engage Synapse &rarr;</div>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
