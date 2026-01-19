
import React from 'react';
import type { AnalysisResult, SingleComponentAnalysis } from '../types';
import { ResultCard } from './ResultCard';
import { LoadingIcon, FlaskIcon, ErrorIcon } from './Icons';

interface ResultsPanelProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  onGenerateCurve: (index: number) => void;
  curveLoadingStatus: Record<number, boolean>;
}

const renderTable = (data: Record<string, string | number | boolean>) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
        {Object.entries(data).map(([key, value]) => (
          <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">{key}</td>
            <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{String(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ComponentDetails: React.FC<{
  component: SingleComponentAnalysis;
  index: number;
  onGenerateCurve: (index: number) => void;
  curveLoadingStatus: Record<number, boolean>;
}> = ({ component, index, onGenerateCurve, curveLoadingStatus }) => {
    const { basicProfile, physicochemical, structureAnalysis, toxicology } = component;
    const isCurveLoading = !!curveLoadingStatus[index];

    return (
        <>
            <ResultCard title="基本档案">
                {renderTable({
                    'IUPAC 名称': basicProfile.iupacName,
                    '中文名称': basicProfile.chineseName,
                    '分子式': basicProfile.formula,
                    '精确分子量': basicProfile.molecularWeight,
                })}
            </ResultCard>
            <ResultCard title="理化性质与谱图预测">
                <div className="space-y-4">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">pH-LogD 曲线</h4>
                    {physicochemical.phLogD.phLogDCurveImage ? (
                        <div className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-700/50">
                            <img 
                                src={`data:image/png;base64,${physicochemical.phLogD.phLogDCurveImage}`} 
                                alt="pH-LogD Curve" 
                                className="w-full h-auto rounded-md"
                            />
                        </div>
                    ) : (
                        <div className="text-center p-4 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-700/50">
                            <button
                                onClick={() => onGenerateCurve(index)}
                                disabled={isCurveLoading}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-transform transform active:scale-95"
                            >
                                {isCurveLoading ? (
                                    <><LoadingIcon className="animate-spin -ml-1 mr-2 h-4 w-4" /> 生成中...</>
                                ) : (
                                    '生成pH-LogD曲线图'
                                )}
                            </button>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">按需生成以加快初始分析速度</p>
                        </div>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-400">{physicochemical.phLogD.trendDescription}</p>
                    {renderTable({
                        'pKa 点': physicochemical.phLogD.pkaPoints,
                        '¹H-NMR 预测': physicochemical.nmr.prediction,
                        'MS 预测': physicochemical.ms.prediction,
                    })}
                </div>
            </ResultCard>
            <ResultCard title="深度结构分析">
                <div className="space-y-4">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300">异构体分析</h4>
                    {renderTable({
                        '手性中心 (R/S)': structureAnalysis.isomers.chiralCenters,
                        '顺反异构 (E/Z)': structureAnalysis.isomers.geometricIsomers,
                        '分离建议': structureAnalysis.isomers.separationNotes,
                    })}
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mt-4">互变异构分析</h4>
                    {renderTable({
                        '存在互变异构': structureAnalysis.tautomers.hasTautomers ? '是' : '否',
                        '描述': structureAnalysis.tautomers.description,
                        '色谱影响与建议': structureAnalysis.tautomers.chromatographicEffects,
                    })}
                </div>
            </ResultCard>
            <ResultCard title="毒理学评估">
                {renderTable({
                    'ICH M7 警示结构': toxicology.ichM7.alerts,
                    'ICH M7 分类建议': toxicology.ichM7.classification,
                    'TD50': toxicology.td50.value,
                    'AI (每日允许摄入量)': toxicology.td50.ai,
                    '是否为亚硝胺': toxicology.nitrosamine.isNitrosamine ? '是' : '否',
                    'CPCA 分类': toxicology.nitrosamine.cpcaClass,
                    '亚硝胺 AI 限度': toxicology.nitrosamine.aiLimit,
                })}
            </ResultCard>
        </>
    );
};

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ result, isLoading, error, onGenerateCurve, curveLoadingStatus }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <LoadingIcon className="w-16 h-16 text-cyan-500 animate-spin" />
        <p className="mt-4 text-lg font-medium text-slate-600 dark:text-slate-300">正在生成深度分析报告...</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">此过程涉及多项复杂计算，请耐心等待。</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl shadow-lg p-6 text-center">
        <ErrorIcon className="w-16 h-16 text-red-500 dark:text-red-400" />
        <p className="mt-4 text-lg font-semibold text-red-700 dark:text-red-300">分析失败</p>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 max-w-md">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 text-center">
        <FlaskIcon className="w-20 h-20 text-slate-300 dark:text-slate-600" />
        <p className="mt-4 text-lg font-medium text-slate-600 dark:text-slate-300">等待分析</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">请在左侧输入一个或多个SMILES字符串，或上传一个或多个化学结构图片，然后点击“开始分析”。</p>
      </div>
    );
  }
  
  const { unifiedChromatography, components } = result;

  // Single component view
  if (components.length === 1) {
    const component = components[0];
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                分析报告: {component.basicProfile.iupacName || component.componentId} {component.basicProfile.chineseName ? `(${component.basicProfile.chineseName})` : ''}
            </h2>
            <ComponentDetails 
              component={component} 
              index={0} 
              onGenerateCurve={onGenerateCurve} 
              curveLoadingStatus={curveLoadingStatus}
            />
            <ResultCard title="色谱开发建议">
                {renderTable({
                    '推荐技术': `${unifiedChromatography.technique.recommendation} (${unifiedChromatography.technique.justification})`,
                    '固定相选择': unifiedChromatography.stationaryPhase.recommendation,
                    '流动相 (A泵)': unifiedChromatography.mobilePhase.pumpA,
                    '流动相 (B泵)': unifiedChromatography.mobilePhase.pumpB,
                    '流动相 pH 范围': unifiedChromatography.mobilePhase.phRange,
                    '推荐梯度': unifiedChromatography.mobilePhase.gradient,
                    '检测器选择': unifiedChromatography.detector.recommendation,
                    '检测器参数': unifiedChromatography.detector.settings,
                })}
            </ResultCard>
      </div>
    );
  }

  // Multi-component view
  return (
    <div className="space-y-8">
        <ResultCard title="统一色谱分离方法建议">
            <div className="space-y-2 mb-4">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">策略概述</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">{unifiedChromatography.summary}</p>
            </div>
            {renderTable({
                '推荐技术': `${unifiedChromatography.technique.recommendation} (${unifiedChromatography.technique.justification})`,
                '固定相选择': unifiedChromatography.stationaryPhase.recommendation,
                '流动相 (A泵)': unifiedChromatography.mobilePhase.pumpA,
                '流动相 (B泵)': unifiedChromatography.mobilePhase.pumpB,
                '流动相 pH 范围': unifiedChromatography.mobilePhase.phRange,
                '推荐梯度': unifiedChromatography.mobilePhase.gradient,
                '检测器选择': unifiedChromatography.detector.recommendation,
                '检测器参数': unifiedChromatography.detector.settings,
            })}
        </ResultCard>
      
        <div className="space-y-8">
            {components.map((component, index) => (
                <div key={index} className="space-y-6 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                    <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{component.componentId} 详细分析</h3>
                    <ComponentDetails 
                      component={component} 
                      index={index}
                      onGenerateCurve={onGenerateCurve} 
                      curveLoadingStatus={curveLoadingStatus} 
                    />
                </div>
            ))}
        </div>
    </div>
  );
};
