import React, { useState } from 'react';
import { Trash2, Tag, DollarSign, PenLine, RotateCcw, BoxSelect } from 'lucide-react';
import { InventoryItem, Settings } from '../types';

interface ItemCardProps {
  item: InventoryItem;
  onUpdate: (id: string, field: keyof InventoryItem, value: string) => void;
  onDelete: (id: string) => void;
  settings: Settings;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onUpdate, onDelete, settings }) => {
  // Parse numeric values for calculation
  const getNumericPrice = (priceStr: string) => {
    return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
  };

  const currencySymbol = settings.currency === 'CNY' ? '¥' : '$';
  const newPriceVal = item.newPrice ? getNumericPrice(item.newPrice) : getNumericPrice(item.avgPrice) * 1.5; // Fallback estimate
  
  // Slider Value (1-10)
  const [sliderVal, setSliderVal] = useState(8); // Default to roughly "Good"

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setSliderVal(val);
    
    // Calculate new sell price based on condition
    // Formula: NewPrice * (val / 10)
    // If val is 10 (Brand New), price = NewPrice. 
    // If val is 1 (10%), price = NewPrice * 0.1
    const newSellPrice = Math.round(newPriceVal * (val / 10));
    onUpdate(item.id, 'sellPrice', `${currencySymbol}${newSellPrice}`);
  };

  const handleResetPrice = () => {
    if (item.originalSellPrice) {
      onUpdate(item.id, 'sellPrice', item.originalSellPrice);
      // Reset slider visual approximation
      setSliderVal(8); 
    }
  };

  const getConditionLabel = (val: number) => {
    if (settings.language === 'en') {
      if (val >= 10) return 'New';
      if (val >= 9) return 'Like New';
      if (val >= 7) return 'Good';
      if (val >= 4) return 'Fair';
      return 'Poor';
    }
    // CN
    if (val >= 10) return '全新';
    if (val === 1) return '1折';
    return `${val}折`; 
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-mint-100 mb-4 transition-all hover:shadow-md group">
      {/* Header: Name and Delete */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 mr-2 relative">
          <input
            type="text"
            value={item.name}
            onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
            className="w-full text-lg font-bold text-gray-800 bg-transparent border-b border-transparent focus:border-mint-500 focus:outline-none placeholder-gray-400"
            placeholder={settings.language === 'zh' ? "物品名称" : "Item Name"}
          />
          <PenLine size={12} className="absolute top-1 right-0 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
        <button 
          onClick={() => onDelete(item.id)}
          className="text-gray-300 hover:text-red-400 p-1 -mt-1 -mr-1 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Description */}
      <div className="mb-4 relative">
         <textarea
            value={item.description}
            onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
            rows={2}
            className="w-full text-xs text-gray-500 bg-gray-50/50 rounded-lg p-2 border border-transparent focus:bg-white focus:border-mint-300 focus:outline-none resize-none"
            placeholder={settings.language === 'zh' ? "添加描述..." : "Add description..."}
          />
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 relative">
        <div className="bg-mint-50 rounded-xl p-3 flex flex-col">
          <div className="flex items-center gap-1 text-mint-600 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Tag size={10} />
            <span>{settings.language === 'zh' ? '二手均价' : 'Avg Price'}</span>
          </div>
          <input
            type="text"
            value={item.avgPrice}
            onChange={(e) => onUpdate(item.id, 'avgPrice', e.target.value)}
            className="text-mint-900 font-semibold bg-transparent focus:outline-none w-full text-sm"
          />
        </div>

        <div className="bg-gradient-to-br from-mint-400 to-mint-500 rounded-xl p-3 flex flex-col text-white shadow-mint-200 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-mint-100 text-[10px] font-bold uppercase tracking-wider mb-1">
            <div className="flex items-center gap-1">
              <DollarSign size={10} />
              <span>{settings.language === 'zh' ? '推荐卖价' : 'Sell Price'}</span>
            </div>
            {item.originalSellPrice && item.sellPrice !== item.originalSellPrice && (
              <button onClick={handleResetPrice} className="hover:text-white text-mint-200 transition-colors">
                <RotateCcw size={10} />
              </button>
            )}
          </div>
          <input
            type="text"
            value={item.sellPrice}
            onChange={(e) => onUpdate(item.id, 'sellPrice', e.target.value)}
            className="text-white font-bold bg-transparent focus:outline-none w-full"
          />
        </div>
      </div>

      {/* Condition Slider (Moved to Bottom) */}
      <div className="px-1 pt-2 border-t border-gray-50">
        <div className="flex justify-between items-center text-xs text-mint-700 font-medium mb-2">
          <div className="flex items-center gap-1">
            <BoxSelect size={12} />
            {settings.language === 'zh' ? '成色/折扣' : 'Condition'}
          </div>
          <span className="bg-mint-100 px-2 py-0.5 rounded text-mint-800">
            {getConditionLabel(sliderVal)}
          </span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="10" 
          step="1"
          value={sliderVal}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-mint-500"
        />
        <div className="flex justify-between text-[10px] text-gray-300 mt-1 font-mono">
           <span>10%</span>
           <span>50%</span>
           <span>100%</span>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
