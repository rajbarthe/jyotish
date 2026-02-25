
import React, { useState, useEffect, useRef } from 'react';
import { BirthDetails, ChatMessage, User, PlanetPosition, DashaPeriod, PastConsultation, PanchangData } from './types';
import { NorthIndianChart } from './components/NorthIndianChart';
import { 
  getAstrologicalInsight, 
  generateInitialReading, 
  getSpecializedReport,
  performMatchmaking,
  getPanchangInsights
} from './services/geminiService';
import { 
  Send, Loader2, LogOut, ChevronRight, Home, 
  Heart, Calendar, MessageSquare, Book, Grid,
  ArrowLeft, Clock, Sparkles, ShieldCheck, History, CheckCheck, 
  User as UserIcon, Activity, Zap, Compass, Info, X, Star, FileText, Settings, Users, AlertCircle, Key, RefreshCw
} from 'lucide-react';

const ZODIAC_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'kundli' | 'matching' | 'chat' | 'panchang'>('home');
  const [homeView, setHomeView] = useState<{ type: string; content: string } | null>(null);
  const [initialReading, setInitialReading] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  // Matchmaking State
  const [partnerBDetails, setPartnerBDetails] = useState<BirthDetails>({ name: '', dob: '', tob: '', pob: '', gender: 'female' });
  const [matchResult, setMatchResult] = useState('');
  const [matchingLoading, setMatchingLoading] = useState(false);

  // Panchang State
  const [panchang, setPanchang] = useState<PanchangData>({
    tithi: 'Shukla Navami', nakshatra: 'Rohini', yoga: 'Siddha', karana: 'Bava', weekday: 'Monday', rahuKaal: '07:30 AM - 09:00 AM', abhijit: '11:45 AM - 12:30 PM'
  });
  const [panchangInsight, setPanchangInsight] = useState('');

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pastConsultations, setPastConsultations] = useState<PastConsultation[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`jyotish_portal_history_${user.id}`);
      if (saved) setPastConsultations(JSON.parse(saved));
      
      const loadPanchang = async () => {
        try {
          const insight = await getPanchangInsights();
          setPanchangInsight(insight || '');
        } catch (err: any) {
          if (err.message === "QUOTA_EXHAUSTED") setGlobalError("QUOTA");
        }
      };
      loadPanchang();
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleOpenSelectKey = async () => {
    if (typeof (window as any).aistudio?.openSelectKey === 'function') {
      await (window as any).aistudio.openSelectKey();
      // Assume success as per guidelines and reset UI
      setGlobalError(null);
    } else {
      window.open('https://ai.google.dev/gemini-api/docs/billing', '_blank');
    }
  };

  const handleLogin = async (details: BirthDetails) => {
    setLoading(true);
    setGlobalError(null);
    try {
      const planetaryPositions = PLANETS.map((p, i) => ({
        planet: p, sign: ZODIAC_SIGNS[(i + details.name.length) % 12], degree: `${(Math.random() * 30).toFixed(2)}°`, house: (i % 12) + 1, nakshatra: 'Pushya'
      }));

      const dashas: DashaPeriod[] = PLANETS.map((p, i) => ({
        planet: p, start: `20${22 + i}-01-01`, end: `20${29 + i}-01-01`, isActive: i === 1 
      }));

      const mockKundali = Array.from({ length: 12 }, (_, i) => ({
        house: i + 1, sign: ((i + 3) % 12) + 1, planets: planetaryPositions.filter(p => p.house === i + 1).map(p => p.planet.slice(0, 2))
      }));

      const reading = await generateInitialReading(details);
      setInitialReading(reading || '');
      
      setUser({ id: Date.now().toString(), name: details.name, birthDetails: details, kundaliData: mockKundali, planetaryPositions, dashas });
    } catch (err: any) {
      if (err.message === "QUOTA_EXHAUSTED") setGlobalError("QUOTA");
      else setGlobalError("An unexpected alignment issue occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openReport = async (type: string) => {
    if (!user) return;
    setHomeView({ type, content: '' });
    try {
      const content = await getSpecializedReport(type, user.birthDetails);
      setHomeView({ type, content: content || 'Celestial records currently locked.' });
    } catch (err: any) {
      if (err.message === "QUOTA_EXHAUSTED") {
        setGlobalError("QUOTA");
        setHomeView(null);
      }
    }
  };

  const handleMatchmaking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setMatchingLoading(true);
    try {
      const result = await performMatchmaking(user.birthDetails, partnerBDetails);
      setMatchResult(result || 'Unable to calculate compatibility.');
    } catch (err: any) {
      if (err.message === "QUOTA_EXHAUSTED") setGlobalError("QUOTA");
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !user) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userInput, timestamp: time, status: 'sent' };
    setChatHistory(prev => [...prev, newMsg]);
    setUserInput('');
    setIsTyping(true);
    try {
      const botResponse = await getAstrologicalInsight(user.birthDetails, chatHistory.concat(newMsg));
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: botResponse, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'read' };
      setChatHistory(prev => [...prev, botMsg]);
    } catch (err: any) {
      if (err.message === "QUOTA_EXHAUSTED") setGlobalError("QUOTA");
    } finally {
      setIsTyping(false);
    }
  };

  const QuotaErrorNotice = () => (
    <div className="fixed inset-0 z-[100] bg-[#FCFBF7]/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
      <div className="max-w-md w-full glass rounded-[40px] p-10 border border-red-200 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 via-amber-400 to-red-400 animate-pulse" />
        <div className="w-16 h-16 bg-red-50 rounded-2xl mx-auto mb-6 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-cinzel-dec font-bold text-slate-800 mb-4 tracking-tight">System Limit Reached</h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Our shared planetary portal is experiencing exceptionally high traffic. You can provide your own API key for uninterrupted service or try a lighter model.
        </p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleOpenSelectKey}
            className="w-full bg-[#A27E1D] text-white font-black py-4 rounded-2xl hover:bg-[#854D0E] transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-lg shadow-[#A27E1D]/20 active:scale-95"
          >
            <Key className="w-4 h-4" /> Switch to My Key
          </button>
          <button 
            onClick={() => setGlobalError(null)}
            className="w-full bg-white text-[#A27E1D] font-bold py-4 rounded-2xl border border-[#A27E1D]/20 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
          >
            <RefreshCw className="w-4 h-4" /> Retry with Flash
          </button>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-100">
           <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Professional users can link a paid GCP project at <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[#A27E1D] font-bold underline decoration-dotted">ai.google.dev/billing</a>
           </p>
        </div>
        <button onClick={() => setGlobalError(null)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500"><X className="w-5 h-5" /></button>
      </div>
    </div>
  );

  if (globalError === "QUOTA") return <QuotaErrorNotice />;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FCFBF7]">
        {globalError && (
          <div className="mb-6 px-6 py-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold animate-bounce flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {globalError}
          </div>
        )}
        <div className="max-w-md w-full glass rounded-[40px] p-10 border border-[#A27E1D]/20 text-center animate-in fade-in duration-500 shadow-2xl">
          <div className="w-16 h-16 bg-[#A27E1D] rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-[#A27E1D]/10">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-cinzel-dec font-bold mb-1 text-slate-800 tracking-widest uppercase">VEDIC JYOTISH AI</h1>
          <p className="text-[#A27E1D] text-[10px] font-bold uppercase tracking-[0.4em] mb-10">Trusted Astrology Portal</p>
          <LoginForm onSubmit={handleLogin} isLoading={loading} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto w-full pb-32">
      {/* Professional Portal Header */}
      <header className="sticky top-0 z-50 glass border-b border-[#A27E1D]/10 px-6 py-4 rounded-b-3xl mt-2 mb-6 mx-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#A27E1D] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-cinzel-dec font-bold text-lg text-slate-800 tracking-wider">VEDIC JYOTISH PORTAL</h2>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-[#A27E1D] uppercase tracking-widest">Namaste, {user.name}</span>
                 <span className="w-1 h-1 bg-slate-200 rounded-full" />
                 <span className="text-[10px] text-slate-400 font-bold">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleOpenSelectKey} className="p-2.5 bg-white border border-[#A27E1D]/10 rounded-xl text-[#A27E1D] hover:bg-slate-50 transition-all shadow-sm" title="Change API Key">
              <Key className="w-5 h-5" />
            </button>
            <button onClick={() => setUser(null)} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-red-500 transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Astrosage-style Service Grid */}
            <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <ServiceTile icon={<Compass className="text-blue-500" />} label="Free Kundli" onClick={() => setActiveTab('kundli')} />
              <ServiceTile icon={<Users className="text-rose-500" />} label="Kundli Milan" onClick={() => setActiveTab('matching')} />
              <ServiceTile icon={<Calendar className="text-amber-500" />} label="Panchang" onClick={() => setActiveTab('panchang')} />
              <ServiceTile icon={<Zap className="text-yellow-500" />} label="Yogas" onClick={() => openReport('Yoga Report')} />
              <ServiceTile icon={<Book className="text-emerald-500" />} label="Lal Kitab" onClick={() => openReport('Lal Kitab')} />
              <ServiceTile icon={<ShieldCheck className="text-red-500" />} label="Sade Sati" onClick={() => openReport('Sade Sati')} />
              <ServiceTile icon={<Info className="text-indigo-500" />} label="Dosha" onClick={() => openReport('Dosha Analysis')} />
              <ServiceTile icon={<MessageSquare className="text-slate-500" />} label="Ask AI" onClick={() => setActiveTab('chat')} />
              <ServiceTile icon={<FileText className="text-purple-500" />} label="Remedies" onClick={() => openReport('Remedial Guide')} />
              <ServiceTile icon={<History className="text-orange-500" />} label="Transits" onClick={() => openReport('Transit Impact')} />
              <ServiceTile icon={<Star className="text-cyan-500" />} label="Daily" onClick={() => openReport('Daily Horoscope')} />
              <ServiceTile icon={<Settings className="text-gray-400" />} label="Profile" onClick={() => {}} />
            </section>

            {homeView && (
               <div className="bg-white rounded-[32px] border border-[#A27E1D]/10 overflow-hidden shadow-sm animate-in slide-in-from-top-4 duration-300">
                 <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-cinzel-dec font-bold text-slate-800">{homeView.type}</h3>
                    <button onClick={() => setHomeView(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                 </div>
                 <div className="p-8">
                   {homeView.content ? (
                     <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line text-sm">
                       {homeView.content}
                     </div>
                   ) : (
                     <div className="py-12 flex flex-col items-center justify-center text-slate-300 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-[#A27E1D]/40" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Consulting Celestial Scripts...</p>
                     </div>
                   )}
                 </div>
               </div>
            )}

            {/* Quick Panchang Card */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-cinzel-dec font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#A27E1D]" /> Today's Panchang
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <PanchangItem label="Tithi" value={panchang.tithi} />
                  <PanchangItem label="Nakshatra" value={panchang.nakshatra} />
                  <PanchangItem label="Yoga" value={panchang.yoga} />
                  <PanchangItem label="Karana" value={panchang.karana} />
                </div>
                <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Rahu Kaal:</span>
                    <span className="font-bold text-red-400">{panchang.rahuKaal}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Abhijit Muhurta:</span>
                    <span className="font-bold text-green-500">{panchang.abhijit}</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#FFFBEB] rounded-[32px] p-8 border border-amber-100 shadow-sm">
                 <h3 className="text-sm font-cinzel-dec font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Astral Guidance
                 </h3>
                 <p className="text-slate-600 text-sm leading-relaxed italic">
                   {panchangInsight || "Fetching the day's spiritual alignment..."}
                 </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kundli' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 bg-white rounded-[32px] p-10 border border-slate-100 shadow-sm flex flex-col items-center">
                <h3 className="text-lg font-cinzel-dec font-bold text-slate-800 mb-8 self-start">Lagna Chart (D1)</h3>
                <NorthIndianChart data={user.kundaliData} />
              </div>
              <div className="lg:col-span-7 bg-white rounded-[32px] p-8 border border-slate-100">
                <h3 className="text-lg font-cinzel-dec font-bold text-slate-800 mb-6">Planetary Degrees (Gochara)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="pb-4 font-bold text-slate-400 uppercase tracking-widest text-[9px]">Planet</th>
                        <th className="pb-4 font-bold text-slate-400 uppercase tracking-widest text-[9px]">Sign</th>
                        <th className="pb-4 font-bold text-slate-400 uppercase tracking-widest text-[9px]">Degree</th>
                        <th className="pb-4 font-bold text-slate-400 uppercase tracking-widest text-[9px]">House</th>
                        <th className="pb-4 font-bold text-slate-400 uppercase tracking-widest text-[9px]">Nakshatra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user.planetaryPositions.map((p, i) => (
                        <tr key={i} className="border-b border-slate-50 group hover:bg-slate-50 transition-all">
                          <td className="py-4 font-bold text-slate-700">{p.planet}</td>
                          <td className="py-4 text-slate-500">{p.sign}</td>
                          <td className="py-4 font-mono text-[#A27E1D]">{p.degree}</td>
                          <td className="py-4 text-slate-400">{p.house}</td>
                          <td className="py-4 text-slate-400">{p.nakshatra}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[32px] p-10 border border-[#A27E1D]/20 shadow-sm">
              <h3 className="text-xl font-cinzel-dec font-bold text-slate-800 mb-6 flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#A27E1D]" /> Avakahada Analysis
              </h3>
              <div className="text-slate-600 leading-relaxed whitespace-pre-line font-medium text-base">{initialReading}</div>
            </div>
          </div>
        )}

        {activeTab === 'matching' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                <h3 className="text-lg font-cinzel-dec font-bold text-slate-800 mb-6">Partner Details</h3>
                <form onSubmit={handleMatchmaking} className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input required type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#A27E1D]/40 outline-none text-sm transition-all focus:bg-white" placeholder="Partner's Name" value={partnerBDetails.name} onChange={e => setPartnerBDetails({...partnerBDetails, name: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                        <input required type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs transition-all focus:bg-white" value={partnerBDetails.dob} onChange={e => setPartnerBDetails({...partnerBDetails, dob: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Birth Time</label>
                        <input required type="time" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs transition-all focus:bg-white" value={partnerBDetails.tob} onChange={e => setPartnerBDetails({...partnerBDetails, tob: e.target.value})} />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Birth Place</label>
                      <input required type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm transition-all focus:bg-white" placeholder="City, Country" value={partnerBDetails.pob} onChange={e => setPartnerBDetails({...partnerBDetails, pob: e.target.value})} />
                   </div>
                   <button type="submit" disabled={matchingLoading} className="w-full bg-[#A27E1D] text-white font-black py-4.5 rounded-2xl hover:bg-[#854D0E] transition-all flex items-center justify-center gap-2 mt-4 active:scale-95 text-[10px] uppercase tracking-widest shadow-lg shadow-[#A27E1D]/20">
                     {matchingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Calculate Ashtakoot <ChevronRight className="w-4 h-4" /></>}
                   </button>
                </form>
              </div>
              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-inner flex flex-col items-center justify-center text-center">
                 {!matchResult ? (
                   <div className="space-y-4 opacity-10">
                      <Heart className="w-24 h-24 mx-auto text-[#A27E1D]" />
                      <p className="font-black text-[10px] uppercase tracking-[0.4em]">Gun Milan Matching</p>
                   </div>
                 ) : (
                   <div className="w-full text-left animate-in fade-in slide-in-from-right-4 duration-500">
                     <h4 className="text-xl font-cinzel-dec font-bold text-slate-800 mb-6 flex items-center gap-3">
                        <Heart className="w-6 h-6 text-rose-500" /> Matching Analysis
                     </h4>
                     <div className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">{matchResult}</div>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="fixed inset-x-0 bottom-24 top-24 max-w-6xl mx-auto px-4">
            <div className="w-full h-full bg-white rounded-[40px] border border-slate-100 flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
              <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm">
                    <UserIcon className="w-6 h-6 text-[#A27E1D]" />
                  </div>
                  <div>
                    <h3 className="text-base font-cinzel-dec font-bold text-slate-800 leading-none mb-1">Pandit Shastri</h3>
                    <p className="text-[8px] text-green-600 font-bold uppercase tracking-widest flex items-center gap-1">
                       <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live Consultation
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-xl transition-all ${showHistory ? 'bg-[#A27E1D] text-white shadow-md' : 'text-slate-400'}`}>
                  <History className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#FCFBF7]/30 custom-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-10">
                    <Star className="w-20 h-20" />
                    <p className="text-sm font-black uppercase tracking-[0.3em]">Spiritual Dialogues</p>
                  </div>
                )}
                
                {chatHistory.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%]">
                      <div className={`p-6 rounded-[28px] shadow-sm ${msg.role === 'user' ? 'bg-[#A27E1D] text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-line">{msg.text}</p>
                      </div>
                      <div className={`flex items-center gap-2 mt-2 px-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[9px] font-bold text-slate-300">{msg.timestamp}</span>
                        {msg.role === 'user' && <CheckCheck className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 flex gap-1.5 shadow-sm">
                      <div className="w-2 h-2 bg-[#A27E1D]/30 rounded-full animate-bounce [animation-delay:-0.32s]" />
                      <div className="w-2 h-2 bg-[#A27E1D]/30 rounded-full animate-bounce [animation-delay:-0.16s]" />
                      <div className="w-2 h-2 bg-[#A27E1D]/30 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-8 bg-white border-t border-slate-50 flex gap-4 items-center shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                <input 
                  type="text" 
                  value={userInput} 
                  onChange={(e) => setUserInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                  placeholder="Ask about Career, Love, or Health..." 
                  className="flex-1 px-8 py-5 bg-slate-50 border border-slate-100 rounded-[28px] focus:outline-none focus:border-[#A27E1D]/40 focus:bg-white text-slate-800 text-sm transition-all shadow-inner" 
                />
                <button 
                  onClick={handleSendMessage} 
                  disabled={isTyping || !userInput.trim()} 
                  className="w-16 h-16 bg-[#A27E1D] text-white rounded-[24px] flex items-center justify-center hover:shadow-xl hover:shadow-[#A27E1D]/20 transition-all active:scale-95 disabled:opacity-20 shadow-lg"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modern Portal Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-[#A27E1D]/10 p-4 flex items-center justify-around z-50 rounded-t-[40px] mx-4 mb-4 shadow-2xl shadow-black/5">
        <NavButton active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setHomeView(null); }} icon={<Grid />} label="Portal" />
        <NavButton active={activeTab === 'kundli'} onClick={() => setActiveTab('kundli')} icon={<Compass />} label="Kundli" />
        <NavButton active={activeTab === 'matching'} onClick={() => setActiveTab('matching')} icon={<Users />} label="Milan" />
        <NavButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare />} label="Shastri" />
      </nav>
    </div>
  );
};

const ServiceTile = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button onClick={onClick} className="bg-white rounded-[28px] p-6 flex flex-col items-center justify-center text-center border border-slate-100 shadow-sm hover:shadow-md hover:border-[#A27E1D]/30 transition-all active:scale-95 group">
    <div className="mb-3 transition-transform group-hover:scale-110">{icon}</div>
    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
  </button>
);

const PanchangItem = ({ label, value }: { label: string, value: string }) => (
  <div className="space-y-1">
    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-bold text-slate-800">{value}</p>
  </div>
);

const NavButton = ({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 px-4 py-2 transition-all ${active ? 'text-[#A27E1D] scale-110' : 'text-slate-300 hover:text-slate-500'}`}>
    {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
    <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
  </button>
);

const LoginForm: React.FC<{ onSubmit: (d: BirthDetails) => void, isLoading: boolean }> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<BirthDetails>({ name: '', dob: '', tob: '', pob: '', gender: 'male' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4 text-left">
      <div className="space-y-1">
        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
        <input required type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#A27E1D]/40 focus:bg-white outline-none text-slate-800 text-sm transition-all shadow-inner" placeholder="e.g. Vikramaditya" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-2">Birth Date</label>
          <input required type="date" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#A27E1D]/40 focus:bg-white outline-none text-slate-800 text-xs shadow-inner" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-2">Exact Time</label>
          <input required type="time" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#A27E1D]/40 focus:bg-white outline-none text-slate-800 text-xs shadow-inner" value={formData.tob} onChange={e => setFormData({ ...formData, tob: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-2">Birth City</label>
        <input required type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#A27E1D]/40 focus:bg-white outline-none text-slate-800 text-sm placeholder:text-slate-300 shadow-inner" placeholder="e.g. Ujjain, India" value={formData.pob} onChange={e => setFormData({ ...formData, pob: e.target.value })} />
      </div>
      <button type="submit" disabled={isLoading} className="w-full bg-[#A27E1D] text-white font-black py-5 rounded-[24px] hover:bg-[#854D0E] transition-all shadow-xl shadow-[#A27E1D]/20 flex items-center justify-center gap-2 mt-6 active:scale-95 text-[11px] uppercase tracking-[0.2em]">
        {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Access Ancient Wisdom <ChevronRight className="w-4 h-4" /></>}
      </button>
    </form>
  );
};

export default App;
