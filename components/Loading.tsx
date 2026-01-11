import React from 'react';
import { Sparkles } from 'lucide-react';
import { Settings } from '../types';

interface LoadingProps {
  settings: Settings;
}

const Loading: React.FC<LoadingProps> = ({ settings }) => {
  const t = {
    title: settings.language === 'zh' ? '正在分析物品...' : 'Analyzing items...',
    desc: settings.language === 'zh' 
      ? 'AI 正在识别图片中的物品并评估市场价格，请稍候。' 
      : 'AI is identifying items and estimating market prices, please wait.'
  };

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-mint-300 rounded-full animate-ping opacity-20"></div>
        <div className="bg-white p-4 rounded-full shadow-xl border-2 border-mint-100 relative z-10">
          <Sparkles size={40} className="text-mint-500 animate-pulse" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-mint-900 mb-2">{t.title}</h3>
      <p className="text-gray-500 text-sm max-w-xs">
        {t.desc}
      </p>
    </div>
  );
};

export default Loading;