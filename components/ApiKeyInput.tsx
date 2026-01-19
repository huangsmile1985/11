
import React, { useState } from 'react';
import { KeyIcon, SaveIcon } from './Icons';

interface ApiKeyInputProps {
  onSave: (apiKey: string) => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onSave }) => {
  const [localApiKey, setLocalApiKey] = useState('');

  const handleSaveClick = () => {
    if (localApiKey.trim()) {
      onSave(localApiKey.trim());
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg">
        <div className="flex items-center mb-6">
          <KeyIcon className="h-8 w-8 text-cyan-500 mr-4" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            输入您的API密钥
          </h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          为了使用本应用，请输入您的 Google Gemini API 密钥。密钥将被安全地保存在您的浏览器本地存储中，不会被发送到任何服务器。
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={localApiKey}
            onChange={(e) => setLocalApiKey(e.target.value)}
            placeholder="在此输入您的 Gemini API 密钥"
            className="flex-grow p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow text-slate-800 dark:text-slate-200"
          />
          <button
            onClick={handleSaveClick}
            disabled={!localApiKey.trim()}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            <SaveIcon className="mr-2 h-5 w-5" />
            保存密钥
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
          您可以从 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline">Google AI Studio</a> 获取您的密钥。
        </p>
      </div>
    </div>
  );
};
