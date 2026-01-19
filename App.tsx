
import React, { useState, useCallback } from 'react';
import type { AnalysisResult } from './types';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { Header } from './components/Header';
import { analyzeStructure, generateCurveForStructure } from './services/geminiService';

const App: React.FC = () => {
  const [smilesInput, setSmilesInput] = useState<string>('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [curveLoadingStatus, setCurveLoadingStatus] = useState<Record<number, boolean>>({});

  const handleAnalyze = useCallback(async () => {
    if (!smilesInput && imageFiles.length === 0) {
      setError('请输入SMILES字符串或上传结构图片。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setCurveLoadingStatus({});

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

  const handleGenerateCurve = useCallback(async (componentIndex: number) => {
    if (!analysisResult) return;

    setCurveLoadingStatus(prev => ({ ...prev, [componentIndex]: true }));
    setError(null);

    try {
        const smilesLines = smilesInput.split('\n').filter(s => s.trim() !== '');
        const numSmiles = smilesLines.length;
        
        let curveInput: { smiles?: string; imageBase64?: string } = {};

        if (componentIndex < numSmiles) {
            curveInput.smiles = smilesLines[componentIndex];
        } else {
            const imageIndex = componentIndex - numSmiles;
            if (imageFiles[imageIndex]) {
                const imageBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(imageFiles[imageIndex]);
                });
                curveInput.imageBase64 = imageBase64;
            } else {
                 throw new Error(`Image file for component index ${componentIndex} not found.`);
            }
        }
        
        const imageData = await generateCurveForStructure(curveInput);

        setAnalysisResult(prevResult => {
            if (!prevResult) return null;
            const newComponents = [...prevResult.components];
            if (newComponents[componentIndex]?.physicochemical?.phLogD) {
                 newComponents[componentIndex].physicochemical.phLogD.phLogDCurveImage = imageData;
            }
            return { ...prevResult, components: newComponents };
        });

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : '生成曲线图时发生错误。');
    } finally {
        setCurveLoadingStatus(prev => ({ ...prev, [componentIndex]: false }));
    }
  }, [analysisResult, smilesInput, imageFiles]);


  const handleClear = () => {
    setSmilesInput('');
    setImageFiles([]);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
    setCurveLoadingStatus({});
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
              onGenerateCurve={handleGenerateCurve}
              curveLoadingStatus={curveLoadingStatus}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
