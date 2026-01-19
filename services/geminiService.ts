import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { UnifiedChromatographyResult, SingleComponentAnalysisResult, SingleComponentAnalysis, UnifiedChromatography, Reference } from '../types';

// ... (此处省略 schema 定义部分，与原代码一致) ...

// 1. 获取统一色谱方法
export const getUnifiedChromatography = async (apiKey: string, smiles: string, imageBase64s: string[]): Promise<UnifiedChromatographyResult> => {
    if (!apiKey) throw new Error("API Key is required.");
    const ai = new GoogleGenAI({ apiKey });
    
    // 已修复：修改为稳定版模型名称
    const model = 'gemini-1.5-flash'; 
    const parts: any[] = [];
    let promptText = `请为以下多个化学结构开发一个统一的色谱分离方法。仅返回统一色谱方法部分。`;

    if (smiles) promptText += `\nSMILES字符串列表:\n${smiles}`;
    if (imageBase64s.length > 0) promptText += `\n以及 ${imageBase64s.length} 张结构图片。`;
    parts.push({ text: promptText });
    imageBase64s.forEach(imgData => parts.push({ inlineData: { mimeType: 'image/png', data: imgData } }));

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: {
                systemInstruction: `你是一个世界级的色谱方法开发专家。你的任务是综合评估所有输入的化学结构，并提出一个统一的、稳健的HPLC或GC方法。严格遵循请求的JSON schema。`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { unifiedChromatography: unifiedChromatographySchema },
                    required: ["unifiedChromatography"]
                },
                tools: [{googleSearch: {}}],
            },
        });
        const { data, references } = parseAndExtractReferences(response);
        return { unifiedChromatography: data.unifiedChromatography as UnifiedChromatography, references };
    } catch (error) {
        console.error("Gemini API call for unified chromatography failed:", error);
        throw new Error("无法获取统一色谱方法。");
    }
};

// 2. 获取单组分分析报告
export const getSingleComponentAnalysis = async (apiKey: string, input: { smiles?: string; imageBase64?: string }, componentId: string): Promise<SingleComponentAnalysisResult> => {
    if (!apiKey) throw new Error("API Key is required.");
    const ai = new GoogleGenAI({ apiKey });

    // 已修复：修改为稳定版模型名称
    const model = 'gemini-1.5-flash'; 
    const parts: any[] = [];
    let promptText = `请为ID为 '${componentId}' 的以下化学结构提供详细的分析报告。`;

    if (input.smiles) {
        promptText += `\nSMILES: ${input.smiles}`;
    }
    parts.push({ text: promptText });
    if (input.imageBase64) {
        parts.push({ inlineData: { mimeType: 'image/png', data: input.imageBase64 } });
    }
    
    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: {
                systemInstruction: `你是一个世界级的化学分析专家。你的任务是为一个化学结构提供详细的、独立的分析报告...`, // 此处省略后续 instruction
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { component: singleComponentSchema },
                    required: ["component"]
                },
                tools: [{googleSearch: {}}],
            },
        });
        const { data, references } = parseAndExtractReferences(response);
        return { component: data.component as SingleComponentAnalysis, references };
    } catch (error) {
        console.error(`Analysis failed for ${componentId}:`, error);
        throw new Error(`组分 ${componentId} 的分析失败。`);
    }
};

// 3. 生成 pH-LogD 曲线图
export const generateCurveForStructure = async (apiKey: string, input: { smiles?: string; imageBase64?: string }): Promise<string> => {
    if (!apiKey) throw new Error("API Key is required.");
    const ai = new GoogleGenAI({ apiKey });

    // 已修复：修改为稳定版模型名称
    const model = 'gemini-1.5-flash'; 
  
    const prompt = `使用Python matplotlib为以下化学结构生成曲线图...`;
    // ... (后续逻辑保持不变)
