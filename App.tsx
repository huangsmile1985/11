
import React, { useState, useCallback } from 'react';
import type { AnalysisResult, SingleComponentAnalysis } from './types';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { Header } from './components/Header';
import { getUnifiedChromatography, getSingleComponentAnalysis, generateCurveForStructure } from './services/geminiService';

const App: React.FC = () => {
  const [smilesInput, setSmilesInput] = useState<string>('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [curveLoadingStatus, setCurveLoadingStatus] = useState<Record<number, boolean>>({});

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

  const handleAnalyze = useCallback(async () => {
    if (!smilesInput && imageFiles.length === 0) {
      setError('请输入SMILES字符串或上传结构图片。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurveLoadingStatus({});

    const smilesLines = smilesInput.split('\n').filter(s => s.trim() !== '');
    const componentInputs = [
        ...smilesLines.map((smiles, i) => ({ type: 'smiles' as const, value: smiles, id: `组分 ${i + 1} (SMILES)` })),
        ...imageFiles.map((file, i) => ({ type: 'image' as const, value: file, id: `组分 ${smilesLines.length + i + 1} (图片)` })),
    ];
    
    setAnalysisResult({
        unifiedChromatography: null,
        components: componentInputs.map(ci => ({ status: 'loading', componentId: ci.id })),
        references: [],
    });

    try {
      const imageBase64s = await Promise.all(imageFiles.map(fileToBase64));
      
      // Step 1: Get Unified Chromatography method first for quick feedback
      const chromatographyResult = await getUnifiedChromatography(smilesInput, imageBase64s);
      setAnalysisResult(prev => ({
          ...prev!,
          unifiedChromatography: chromatographyResult.unifiedChromatography,
          references: [...(prev?.references || []), ...(chromatographyResult.references || [])],
      }));

      // Step 2: Concurrently analyze each component
      componentInputs.forEach(async (cInput, index) => {
        try {
            const inputPayload = cInput.type === 'smiles' 
                ? { smiles: cInput.value }
                : { imageBase64: await fileToBase64(cInput.value as File) };
          
            const componentResult = await getSingleComponentAnalysis(inputPayload, cInput.id);

            setAnalysisResult(prev => {
                if (!prev) return null;
                const newComponents = [...prev.components];
                newComponents[index] = componentResult.component;
                const newReferences = [...prev.references, ...(componentResult.references || [])];
                // Simple deduplication of references
                const uniqueReferences = Array.from(new Map(newReferences.map(item => [item.uri, item])).values());
                return { ...prev, components: newComponents, references: uniqueReferences };
            });
        } catch (err) {
            console.error(`Error analyzing component ${cInput.id}:`, err);
            setAnalysisResult(prev => {
                if (!prev) return null;
                const newComponents = [...prev.components];
                newComponents[index] = { status: 'error', componentId: cInput.id, message: err instanceof Error ? err.message : '未知错误' };
                return { ...prev, components: newComponents };
            });
        }
      });

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '分析过程中发生未知错误。请检查您的输入或API密钥后重试。');
      setAnalysisResult(null); // Clear partial results on major failure
    } finally {
      setIsLoading(false); // Main loading is done after dispatching all requests
    }
  }, [smilesInput, imageFiles]);

  const handleGenerateCurve = useCallback(async (componentIndex: number) => {
    if (!analysisResult || !analysisResult.components[componentIndex]) return;

    const component = analysisResult.components[componentIndex];
    if ('status' in component) return; // Don't generate for loading/error states

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
                curveInput.imageBase64 = await fileToBase64(imageFiles[imageIndex]);
            } else {
                 throw new Error(`Image file for component index ${componentIndex} not found.`);
            }
        }
        
        const imageData = await generateCurveForStructure(curveInput);

        setAnalysisResult(prevResult => {
            if (!prevResult) return null;
            const newComponents = [...prevResult.components];
            const targetComponent = newComponents[componentIndex];
            if (targetComponent && 'physicochemical' in targetComponent) {
                 (targetComponent as SingleComponentAnalysis).physicochemical.phLogD.phLogDCurveImage = imageData;
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
              isLoading={isLoading && !analysisResult?.unifiedChromatography} // Show main loader only before first result
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
