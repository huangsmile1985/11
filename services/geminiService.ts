import { GoogleGenerativeAI } from "@google/generative-ai";
import type { UnifiedChromatographyResult, SingleComponentAnalysisResult, UnifiedChromatography, Reference } from '../types';

const MODEL_NAME = "gemini-1.5-flash"; // 稳定且免费

// 1. 统一色谱方法
export const getUnifiedChromatography = async (apiKey: string, smiles: string, imageBase64s: string[]): Promise<UnifiedChromatographyResult> => {
    if (!apiKey) throw new Error("API Key is required.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `请为以下结构开发统一色谱方法：\n${smiles}`;
    try {
        const result = await model.generateContent([prompt, ...imageBase64s.map(data => ({inlineData: {mimeType: 'image/png', data}}))]);
        const data = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
        return { unifiedChromatography: data.unifiedChromatography, references: [] };
    } catch (error) {
        throw new Error("无法获取统一色谱方法。");
    }
};

// 2. 单组分分析
export const getSingleComponentAnalysis = async (apiKey: string, input: { smiles?: string; imageBase64?: string }, componentId: string): Promise<SingleComponentAnalysisResult> => {
    if (!apiKey) throw new Error("API Key is required.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const parts = [{ text: `详细分析 ID: ${componentId}。SMILES: ${input.smiles || '见图片'}` }];
    if (input.imageBase64) parts.push({ inlineData: { mimeType: 'image/png', data: input.imageBase64 } } as any);

    try {
        const result = await model.generateContent(parts);
        const data = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
        return { component: data.component, references: [] };
    } catch (error) {
        throw new Error(`组分 ${componentId} 的分析失败。`);
    }
};

// 3. 曲线图生成
export const generateCurveForStructure = async (apiKey: string, input: { smiles?: string; imageBase64?: string }): Promise<string> => {
    if (!apiKey) throw new Error("API Key is required.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `生成 pH-logD 曲线图 Base64 编码。SMILES: ${input.smiles || '见图'}`;
    try {
        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
        return data.phLogDCurveImage;
    } catch (error) {
        throw new Error("无法生成曲线图。");
    }
};
