import React, { useState, useCallback } from 'react';
import { Copy, RefreshCw, ChevronLeft, Plus, Check, Globe, DollarSign, Image as ImageIcon, Edit3, X, ZoomIn } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ItemCard from './components/ItemCard';
import Loading from './components/Loading';
import ImageAnnotator from './components/ImageAnnotator';
import { InventoryItem, Settings, Annotation } from './types';
import { analyzeImage } from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<'upload' | 'annotate' | 'list' | 'add-from-image'>('upload');
  const [showFullImage, setShowFullImage] = useState(false);
  
  const [image, setImage] = useState<string | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  
  // Pending annotations for current session
  const [pendingAnnotations, setPendingAnnotations] = useState<Annotation[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<Settings>({
    language: 'zh',
    currency: 'CNY'
  });

  // --- Helpers ---
  
  const getAnnotations = (): Annotation[] => {
    const existingAnnotations: Annotation[] = items
      .filter(item => item.annotation)
      .map(item => ({ ...item.annotation!, itemId: item.id }));
    
    return [...existingAnnotations, ...pendingAnnotations];
  };

  // --- Handlers ---

  const handleImageSelected = (base64: string) => {
    setImage(base64);
    setPendingAnnotations([]);
    setItems([]);
    setView('annotate');
    setError(null);
  };

  const performAnalysis = async (annsToAnalyze: Annotation[], isAppending: boolean = false) => {
    if (!image) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const detectedItems = await analyzeImage(image, settings, annsToAnalyze);
      
      // Map annotations back to items
      const mappedItems = detectedItems.map((item, index) => ({
        ...item,
        annotation: annsToAnalyze.length > index ? annsToAnalyze[index] : undefined
      }));

      if (isAppending) {
        setItems(prev => [...prev, ...mappedItems]);
      } else {
        setItems(mappedItems);
      }
      
      setView('list');
      setPendingAnnotations([]); 
    } catch (err) {
      setError(settings.language === 'zh' ? "识别失败，请重试" : "Analysis failed, please try again");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialAnalyze = () => {
    performAnalysis(pendingAnnotations, false);
  };

  const handleOpenAddFromImage = () => {
    setPendingAnnotations([]); 
    setView('add-from-image');
  };

  const handleConfirmAddItems = () => {
    if (pendingAnnotations.length === 0) return;
    performAnalysis(pendingAnnotations, true);
  };

  const handleAnnotationAdd = (ann: Annotation) => {
    setPendingAnnotations(prev => [...prev, ann]);
  };

  const handleAnnotationRemove = (index: number, annotation: Annotation) => {
    if (annotation.itemId) {
      handleDeleteItem(annotation.itemId);
    } else {
      // Remove from pending based on reference
      setPendingAnnotations(prev => prev.filter(p => p !== annotation));
    }
  };

  const handleAnnotationUpdate = (index: number, newAnn: Annotation) => {
    const existingCount = items.filter(i => i.annotation).length;
    
    if (index < existingCount) {
        // It's an existing item's annotation
        // We need to find the specific item. Since items might not all have annotations,
        // we walk through items to find the Nth one with an annotation.
        let currentIndex = 0;
        const targetItem = items.find(item => {
            if (item.annotation) {
                if (currentIndex === index) return true;
                currentIndex++;
            }
            return false;
        });

        if (targetItem) {
             setItems(prev => prev.map(i => i.id === targetItem.id ? { ...i, annotation: newAnn } : i));
        }
    } else {
        // It's a pending annotation
        const pendingIndex = index - existingCount;
        setPendingAnnotations(prev => {
            const next = [...prev];
            next[pendingIndex] = newAnn;
            return next;
        });
    }
  };

  const handleReset = () => {
    if (view === 'list' || view === 'add-from-image') {
       if (view === 'add-from-image') {
           setView('list');
           setPendingAnnotations([]);
       } else {
            setView('upload');
            setImage(null);
            setItems([]);
            setPendingAnnotations([]);
       }
    } else if (view === 'annotate') {
        setView('upload');
        setImage(null);
        setPendingAnnotations([]);
    }
  };

  const handleUpdateItem = useCallback((id: string, field: keyof InventoryItem, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleAddManualItem = () => {
    const newItem: InventoryItem = {
      id: Math.random().toString(36).substring(7),
      name: settings.language === 'zh' ? "新物品" : "New Item",
      description: "",
      avgPrice: "",
      sellPrice: "",
      newPrice: "0",
      originalSellPrice: ""
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleCopyList = () => {
    const header = settings.language === 'zh' ? "📦 二手回血清单 \n\n" : "📦 Inventory List \n\n";
    const footer = settings.language === 'zh' ? "\n--------\n由 MintScan 生成" : "\n--------\nGenerated by MintScan";
    
    const text = items.map((item, index) => {
        if (settings.language === 'zh') {
            return `${index + 1}. ${item.name}\n   描述: ${item.description}\n   均价: ${item.avgPrice} | 建议: ${item.sellPrice}\n`;
        } else {
            return `${index + 1}. ${item.name}\n   Desc: ${item.description}\n   Avg: ${item.avgPrice} | Sell: ${item.sellPrice}\n`;
        }
    }).join('\n');

    navigator.clipboard.writeText(header + text + footer).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleLanguage = () => {
    setSettings(prev => ({
      ...prev,
      language: prev.language === 'zh' ? 'en' : 'zh',
      currency: prev.language === 'zh' ? 'USD' : 'CNY'
    }));
  };
  
  const toggleCurrency = () => {
    setSettings(prev => ({
      ...prev,
      currency: prev.currency === 'CNY' ? 'USD' : 'CNY'
    }));
  };

  // --- Render ---

  if (isLoading) return <Loading settings={settings} />;

  // Full Screen Image Modal
  if (showFullImage && image) {
      return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center animate-in fade-in duration-200">
            <button 
                onClick={() => setShowFullImage(false)}
                className="absolute top-6 right-6 p-2 bg-white/20 rounded-full text-white backdrop-blur-md hover:bg-white/40"
            >
                <X size={24} />
            </button>
            <img 
                src={image} 
                alt="Full View" 
                className="max-w-full max-h-full object-contain"
            />
        </div>
      );
  }

  // 1. Upload View
  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-mint-50 flex flex-col">
        <header className="px-6 py-6 pt-12 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-mint-900 tracking-tight">MintScan</h1>
            <p className="text-mint-700 mt-1 opacity-80">
              {settings.language === 'zh' ? '极简智能物品识别' : 'Smart Inventory Scanner'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleLanguage} className="p-2 bg-white/50 rounded-full text-mint-800 hover:bg-white transition-colors">
                <Globe size={20} />
            </button>
          </div>
        </header>
        <main className="flex-1">
          <FileUpload onImageSelected={handleImageSelected} />
        </main>
      </div>
    );
  }

  // 2. Annotate View (Initial) OR Add From Image
  if ((view === 'annotate' || view === 'add-from-image') && image) {
    const isAddMode = view === 'add-from-image';
    
    return (
      <div className="h-screen bg-black flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-12 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
           <button 
             onClick={handleReset}
             className="p-2 rounded-full bg-white/20 text-white backdrop-blur-md pointer-events-auto"
           >
             <ChevronLeft size={24} />
           </button>
           
           {isAddMode && (
             <span className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
                {settings.language === 'zh' ? '点击图片添加物品' : 'Add Items'}
             </span>
           )}

           <div className="pointer-events-auto flex gap-2">
             {!isAddMode && (
                <button onClick={toggleCurrency} className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/10">
                  {settings.currency}
                </button>
             )}
           </div>
        </div>
        
        <ImageAnnotator 
          imageSrc={image}
          annotations={getAnnotations()}
          onAnnotationAdd={handleAnnotationAdd}
          onAnnotationRemove={handleAnnotationRemove}
          onAnnotationUpdate={handleAnnotationUpdate}
          onAnalyze={isAddMode ? handleConfirmAddItems : handleInitialAnalyze}
          settings={settings}
          mode={isAddMode ? 'add' : 'initial'}
        />
      </div>
    );
  }

  // 3. List View
  return (
    <div className="min-h-screen bg-mint-50 flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-mint-50/90 backdrop-blur-md px-4 py-3 pt-12 flex justify-between items-center border-b border-mint-100">
        <button 
          onClick={handleReset}
          className="p-2 rounded-full hover:bg-mint-100 text-mint-800 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-bold text-mint-900 text-lg">
            {settings.language === 'zh' ? `识别结果 (${items.length})` : `Results (${items.length})`}
        </h2>
        <button onClick={toggleCurrency} className="p-2 rounded-full hover:bg-mint-100 text-mint-800 transition-colors">
            <DollarSign size={20} />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-32 max-w-2xl mx-auto w-full">
        {/* Reference Image Thumbnail */}
        <div 
            onClick={() => setShowFullImage(true)}
            className="mb-6 rounded-2xl overflow-hidden shadow-sm border border-mint-100 h-32 bg-gray-100 relative group cursor-pointer"
        >
          <img 
            src={image || ''} 
            alt="Original" 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
             <div className="bg-white/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100">
                <ZoomIn size={20} className="text-mint-700" />
             </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm text-center border border-red-100">
            {error}
          </div>
        )}

        {/* List */}
        <div className="space-y-4">
          {items.map(item => (
            <ItemCard 
              key={item.id} 
              item={item} 
              onUpdate={handleUpdateItem} 
              onDelete={handleDeleteItem}
              settings={settings}
            />
          ))}
          
          {/* Add Item Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button 
                onClick={handleOpenAddFromImage}
                className="py-4 rounded-2xl bg-white border-2 border-dashed border-mint-200 text-mint-500 font-medium flex flex-col items-center justify-center gap-2 hover:bg-mint-50 transition-all shadow-sm"
            >
                <ImageIcon size={24} />
                <span className="text-xs">{settings.language === 'zh' ? '从图片提取' : 'Scan from Image'}</span>
            </button>
            <button 
                onClick={handleAddManualItem}
                className="py-4 rounded-2xl bg-white border-2 border-dashed border-mint-200 text-mint-500 font-medium flex flex-col items-center justify-center gap-2 hover:bg-mint-50 transition-all shadow-sm"
            >
                <Edit3 size={24} />
                <span className="text-xs">{settings.language === 'zh' ? '手动添加' : 'Add Manually'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-mint-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
           <div className="max-w-2xl mx-auto flex gap-3">
             <button 
               onClick={handleReset}
               className="flex-1 py-3 px-4 rounded-xl bg-mint-50 text-mint-700 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
             >
               <RefreshCw size={20} />
               <span className="text-sm">{settings.language === 'zh' ? '重新拍摄' : 'Restart'}</span>
             </button>
             <button 
               onClick={handleCopyList}
               className={`flex-[2] py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg transition-all active:scale-95 ${
                 copied ? 'bg-mint-600' : 'bg-mint-500 hover:bg-mint-600'
               }`}
             >
               {copied ? <Check size={20} /> : <Copy size={20} />}
               <span className="text-sm">
                   {copied 
                     ? (settings.language === 'zh' ? '已复制！' : 'Copied!') 
                     : (settings.language === 'zh' ? '复制清单' : 'Copy List')
                   }
               </span>
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
