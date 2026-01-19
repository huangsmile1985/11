
import React, { useState, useCallback } from 'react';
import type { AnalysisResult } from './types';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { Header } from './components/Header';
import { analyzeStructure } from './services/geminiService';

const App: React.FC = () => {
  const [smilesInput, setSmilesInput] = useState<string>('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!smilesInput && imageFiles.length === 0) {
      setError('请输入SMILES字符串或上传结构图片。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const imageBase64s: string[] = await Promise.all(
        imageFiles.map(file => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        }))
      );

      const result = await analyzeStructure(smilesInput, imageBase64s);
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '分析过程中发生未知错误。请检查您的输入或API密钥后重试。');
    } finally {
      setIsLoading(false);
    }
  }, [smilesInput, imageFiles]);

  const handleClear = () => {
    setSmilesInput('');
    setImageFiles([]);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <InputPanel
              smilesInput={smilesInput}
              setSmilesInput={setSmilesInput}
              imageFiles={imageFiles}
              setImageFiles={setImageFiles}
              onAnalyze={handleAnalyze}
              onClear={handleClear}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-8">
            <ResultsPanel
              result={analysisResult}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
