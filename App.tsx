import React, { useState, useRef, useEffect } from 'react';
import { Camera, Loader2, MapPin, Navigation, RotateCcw, Upload, Download, Info, X, Share2, Copy, Mail, Globe, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import CameraCapture from './components/Camera';
import { identifyStreetDetails, checkAPIKeyStatus } from './services/gemini';
import { determineDistrict } from './services/streetLogic';
import { speakText } from './services/tts';
import { parseCSV } from './services/csvParser';
import { downloadProjectZip } from './services/downloader';
import { AppStep, StreetResult } from './types';

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.IDLE);
  const [result, setResult] = useState<StreetResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string>("");
  
  // Database State - No persistence
  const [streetMap, setStreetMap] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check API Key on Mount
  useEffect(() => {
    setApiKeyStatus(checkAPIKeyStatus());
  }, []);

  // Install Prompt Listener
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("Install prompt captured");
    });
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
      setShowInstallHelp(true);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Straßen-Scanner',
      text: 'Ich nutze diese App zum Scannen von Straßenschildern.',
      url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
           setShowShareModal(true);
        }
      }
    } else {
      setShowShareModal(true);
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`Schau dir diese App an: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Straßen-Scanner App');
    const body = encodeURIComponent(`Hier ist der Link zur App: ${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }).catch(() => alert("Konnte Link nicht kopieren"));
  };

  const handleDownloadProject = async () => {
    setIsZipping(true);
    try {
      await downloadProjectZip();
    } catch (e) {
      console.error(e);
      alert("Fehler beim Erstellen der ZIP-Datei.");
    } finally {
      setIsZipping(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const map = await parseCSV(file);
      setStreetMap(map);
      
      alert(`${map.size} Straßen erfolgreich geladen.`);
    } catch (e) {
      console.error(e);
      alert("Fehler beim Lesen der Datei.");
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCapture = async (imageSrc: string) => {
    if (!apiKeyStatus) {
      alert("Fehler: Kein API Key gefunden. Bitte Konfiguration prüfen.");
      return;
    }

    setCapturedImage(imageSrc);
    setStep(AppStep.PROCESSING_IMAGE);
    setLastError("");
    
    try {
      const { street, number, streetBox, numberBox } = await identifyStreetDetails(imageSrc);
      
      if (street === 'UNKNOWN') {
        alert("Konnte keine Straße erkennen. Bitte nochmal versuchen.");
        setStep(AppStep.IDLE);
        return;
      }

      // Check logic with Map
      const logicResult = determineDistrict(street, number, streetMap, streetBox, numberBox);
      setResult(logicResult);
      setStep(AppStep.RESULT);
      
      if (logicResult.district) {
        speakText(logicResult.district);
      }

    } catch (e: any) {
      console.error(e);
      if (e.message === 'API_KEY_MISSING') {
         alert("Kritischer Fehler: Der API Key fehlt im Build!\n\nHast du nach dem Eintragen des Keys in Vercel einen 'Redeploy' gemacht?");
         setStep(AppStep.IDLE);
      } else {
         setLastError(e.message || "Unbekannter Fehler");
         setStep(AppStep.ERROR);
      }
    }
  };

  const reset = () => {
    setStep(AppStep.IDLE);
    setResult(null);
    setCapturedImage(null);
    setLastError("");
  };

  // Helper to draw bounding boxes
  const renderBoundingBox = (box: number[] | undefined, colorClass: string) => {
    if (!box || box.length !== 4) return null;
    const [ymin, xmin, ymax, xmax] = box;
    
    const top = ymin / 10;
    const left = xmin / 10;
    const width = (xmax - xmin) / 10;
    const height = (ymax - ymin) / 10;

    return (
      <div 
        className={`absolute border-4 ${colorClass} shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 rounded-sm`}
        style={{
          top: `${top}%`,
          left: `${left}%`,
          width: `${width}%`,
          height: `${height}%`
        }}
      />
    );
  };

  if (step === AppStep.CAMERA) {
    return <CameraCapture onCapture={handleCapture} onClose={() => setStep(AppStep.IDLE)} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="w-full p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between z-10 gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <MapPin className="text-blue-400" size={24} />
          {/* API Key Status Indicator */}
          <div className="flex items-center gap-1" title={apiKeyStatus ? "KI Bereit" : "API Key fehlt"}>
             <div className={`w-3 h-3 rounded-full ${apiKeyStatus ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 animate-pulse'}`}></div>
          </div>
        </div>
        
        <div className="flex gap-2 items-center overflow-x-auto no-scrollbar">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-blue-500/20 shrink-0 animate-pulse transition-all"
            >
              <Download size={18} />
              <span>Anheften</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all text-white flex items-center gap-1 text-sm font-bold shrink-0"
            title="App Link teilen"
          >
            <Share2 size={18} />
          </button>

          {!deferredPrompt && (
            <button
              onClick={() => setShowInstallHelp(true)}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all text-white flex items-center gap-1 text-sm font-bold shrink-0"
              title="Info / Download"
            >
              <Info size={18} />
            </button>
          )}

          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-bold shadow-lg shrink-0 whitespace-nowrap ${streetMap.size > 0 ? 'bg-green-500 hover:bg-green-400 text-slate-900' : 'bg-yellow-400 hover:bg-yellow-300 text-slate-900 shadow-yellow-400/20'}`}
          >
            <Upload size={18} />
            <span>CSV hochladen</span>
            {streetMap.size > 0 && <span className="ml-1 bg-black/20 px-2 py-0.5 rounded-full text-xs">{streetMap.size}</span>}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full p-6 flex flex-col items-center justify-center relative overflow-y-auto">
        
        {step === AppStep.IDLE && !capturedImage && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="w-48 h-48 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-slate-700">
               <Navigation size={80} className="text-slate-500 opacity-50" />
            </div>
            
            <div className="space-y-4">
              <p className="text-slate-300 text-lg max-w-[250px] mx-auto leading-relaxed">
                Fotografiere ein Straßenschild.
              </p>
              
              {!apiKeyStatus && (
                <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-lg max-w-xs mx-auto text-red-200 text-sm font-bold">
                  ⚠️ API Key fehlt. Bitte App neu bauen (Redeploy).
                </div>
              )}

              {streetMap.size === 0 && (
                <div className="bg-yellow-900/30 border border-yellow-700/50 p-4 rounded-lg max-w-xs mx-auto">
                  <p className="text-yellow-200 text-sm">
                    Hinweis: Noch keine Straßenliste geladen. Bitte CSV importieren.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === AppStep.PROCESSING_IMAGE && (
          <div className="text-center">
            {capturedImage && (
              <img src={capturedImage} alt="Captured" className="w-32 h-32 object-cover rounded-xl mx-auto mb-6 border-2 border-blue-500 opacity-50" />
            )}
            <Loader2 className="animate-spin w-16 h-16 text-blue-500 mx-auto mb-4" />
            <p className="text-xl font-semibold animate-pulse">Analysiere Bild...</p>
          </div>
        )}

        {step === AppStep.RESULT && result && (
          <div className="text-center w-full animate-in zoom-in duration-300 flex flex-col items-center">
            
            {capturedImage && (
              <div className="relative w-full max-w-xs mb-6 rounded-lg overflow-hidden shadow-xl border border-slate-600">
                <img src={capturedImage} alt="Analysis" className="w-full h-auto block" />
                {renderBoundingBox(result.streetBox, 'border-green-400 shadow-green-400/50')}
                {renderBoundingBox(result.numberBox, 'border-yellow-400 shadow-yellow-400/50')}
                
                <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm p-1 flex justify-center gap-4 text-[10px] text-white">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full"></span> Straße</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full"></span> Nummer</span>
                </div>
              </div>
            )}

            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl w-full">
              <h3 className="text-slate-400 uppercase tracking-wider text-sm mb-2">Ergebnis</h3>
              <p className="text-xl text-slate-300 mb-1">{result.name}</p>
              <p className="text-md text-slate-400 mb-6">{result.number ? `Hausnummer ${result.number}` : 'Keine Nummer erkannt'}</p>
              <div className="my-6">
                <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                  {result.district}
                </span>
              </div>
            </div>
            <button 
              onClick={() => speakText(result.district || '')}
              className="mt-6 text-slate-400 hover:text-white underline text-sm"
            >
              Erneut vorlesen
            </button>
          </div>
        )}

        {step === AppStep.ERROR && (
           <div className="text-center w-full max-w-xs">
             <div className="text-red-500 text-6xl mb-4 mx-auto block">!</div>
             <h3 className="text-xl font-bold text-white mb-2">Fehler aufgetreten</h3>
             <div className="bg-slate-800 p-4 rounded-lg border border-red-500/30 text-red-200 text-sm font-mono mb-4 break-words">
                {lastError}
             </div>
             <button onClick={reset} className="px-6 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">Zurück</button>
           </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 bg-slate-900/90 backdrop-blur-sm z-20 flex flex-col items-center border-t border-slate-800">
        <div className="w-full mb-6">
          {step === AppStep.IDLE ? (
            <button 
              onClick={() => setStep(AppStep.CAMERA)}
              disabled={!apiKeyStatus}
              className={`w-full font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition-all ${apiKeyStatus ? 'bg-yellow-400 hover:bg-yellow-300 active:scale-95 shadow-yellow-400/20 text-slate-900' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
            >
              <Camera size={24} />
              {apiKeyStatus ? 'Kamera Starten' : 'API Key fehlt'}
            </button>
          ) : step === AppStep.RESULT || step === AppStep.ERROR ? (
            <button 
              onClick={reset}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <RotateCcw size={20} />
              Neuer Scan
            </button>
          ) : null}
        </div>
        
        <div className="text-blue-400 font-mono text-xs tracking-widest opacity-80">
          Erzeugt von A. Abdel
        </div>
      </footer>

      {/* Share Modal */}
      {showShareModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
           <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl max-w-sm w-full relative">
              <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-700/50 rounded-full p-1"><X size={20} /></button>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Share2 className="text-blue-400" size={24}/> App teilen</h2>
              <div className="space-y-3">
                 <button onClick={shareViaWhatsApp} className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl transition-colors shadow-lg active:scale-95">WhatsApp</button>
                 <button onClick={shareViaEmail} className="flex items-center justify-center gap-2 w-full py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl transition-colors shadow-lg active:scale-95"><Mail size={20} /> E-Mail</button>
                 <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex items-center gap-2 mt-2">
                    <input type="text" readOnly value={window.location.href} className="bg-transparent text-slate-400 text-sm flex-1 outline-none truncate" />
                    <button onClick={copyLink} className={`p-2 rounded-lg transition-colors ${copyFeedback ? 'text-green-400' : 'text-blue-400 hover:bg-blue-500/10'}`}>{copyFeedback ? "✓" : <Copy size={20} />}</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Installation Help Modal */}
      {showInstallHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
           <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl max-w-sm w-full relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowInstallHelp(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-700/50 rounded-full p-1"><X size={20} /></button>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Download className="text-blue-400" size={24}/> Info & Installation</h2>
              
              <div className="mb-4 bg-slate-900 p-3 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-sm text-slate-400">System Status:</span>
                   {apiKeyStatus ? <span className="text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12}/> KI BEREIT</span> : <span className="text-red-400 text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/> KEY FEHLT</span>}
                </div>
                {!apiKeyStatus && <p className="text-xs text-red-300">Bitte Key in Vercel eintragen und 'Redeploy' klicken.</p>}
              </div>

              <div className="space-y-4 text-sm text-slate-300">
                <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                  <h3 className="font-bold text-white mb-2">🍎 iPhone (iOS)</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-1 text-xs">
                    <li>Teilen-Button drücken.</li>
                    <li>"Zum Home-Bildschirm" wählen.</li>
                  </ol>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                  <h3 className="font-bold text-white mb-2">🤖 Android</h3>
                  <ol className="list-decimal list-inside space-y-1 ml-1 text-xs">
                    <li>"Anheften" Button oben nutzen.</li>
                    <li>Oder im Menü: "App installieren".</li>
                  </ol>
                </div>
                <div className="border-t border-slate-600 pt-4 mt-4">
                   <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Package size={16} /> Update / Download</h3>
                   <button onClick={handleDownloadProject} disabled={isZipping} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
                     {isZipping ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />}
                     Projekt herunterladen
                   </button>
                </div>
              </div>
              <button onClick={() => setShowInstallHelp(false)} className="w-full mt-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors">Schließen</button>
           </div>
        </div>
      )}
    </div>
  );
}