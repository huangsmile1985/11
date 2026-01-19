
import React, { useState, useRef } from 'react';
import { UploadIcon, ClearIcon, AnalyzeIcon, LoadingIcon } from './Icons';

interface InputPanelProps {
  smilesInput: string;
  setSmilesInput: (value: string) => void;
  imageFiles: File[];
  setImageFiles: (files: File[]) => void;
  onAnalyze: () => void;
  onClear: () => void;
  isLoading: boolean;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  smilesInput,
  setSmilesInput,
  imageFiles,
  setImageFiles,
  onAnalyze,
  onClear,
  isLoading,
}) => {
  const [inputMode, setInputMode] = useState<'smiles' | 'image'>('smiles');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setImageFiles(Array.from(files));
      setSmilesInput('');
    }
  };
  
  const handleSmilesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSmilesInput(event.target.value);
    setImageFiles([]);
  };

  const handleClear = () => {
    onClear();
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">输入化学结构</h2>
      
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
        <button 
          onClick={() => setInputMode('smiles')}
          className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${inputMode === 'smiles' ? 'border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          SMILES 字符串
        </button>
        <button 
          onClick={() => setInputMode('image')}
          className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${inputMode === 'image' ? 'border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          上传结构图
        </button>
      </div>

      <div className="flex-grow">
        {inputMode === 'smiles' ? (
          <textarea
            value={smilesInput}
            onChange={handleSmilesChange}
            placeholder="在此处输入多个SMILES字符串，每行一个。"
            className="w-full h-40 p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
            disabled={isLoading}
          />
        ) : (
          <div 
            className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif" multiple disabled={isLoading} />
            <UploadIcon className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
            {imageFiles.length > 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">已选择 {imageFiles.length} 个文件</p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">点击上传</span> 或拖拽文件</p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">可一次选择多个图片文件</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
        <button
          onClick={onAnalyze}
          disabled={isLoading || (!smilesInput && imageFiles.length === 0)}
          className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-transform transform active:scale-95"
        >
          {isLoading ? <LoadingIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" /> : <AnalyzeIcon className="-ml-1 mr-2 h-5 w-5" />}
          {isLoading ? '分析中...' : '开始分析'}
        </button>
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-slate-300 dark:border-slate-600 text-base font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition-colors"
        >
          <ClearIcon className="-ml-1 mr-2 h-5 w-5" />
          清除
        </button>
      </div>
    </div>
  );
};
