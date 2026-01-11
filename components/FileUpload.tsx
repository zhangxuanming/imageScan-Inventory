import React, { useRef } from 'react';
import { Camera, Upload } from 'lucide-react';

interface FileUploadProps {
  onImageSelected: (base64: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onImageSelected(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[60vh] p-6">
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="relative group cursor-pointer w-full max-w-sm aspect-[3/4] rounded-3xl border-4 border-dashed border-mint-300 bg-white/50 hover:bg-white/80 transition-all duration-300 flex flex-col items-center justify-center shadow-sm hover:shadow-md"
      >
        <div className="bg-mint-100 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
          <Camera size={48} className="text-mint-600" />
        </div>
        <h3 className="text-xl font-bold text-mint-900 mb-2">拍摄或上传图片</h3>
        <p className="text-mint-700 text-center px-8 text-sm">
          点击这里上传物品照片<br/>AI 将自动识别并估价
        </p>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileChange}
        />
        
        <div className="absolute bottom-8 flex items-center gap-2 text-mint-500 text-xs font-medium bg-mint-50 px-3 py-1 rounded-full">
           <Upload size={14} /> 支持 JPG, PNG
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
