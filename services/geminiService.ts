import { GoogleGenerativeAI } from "@google/generative-ai";
import type { UnifiedChromatographyResult, SingleComponentAnalysisResult, UnifiedChromatography, Reference } from '../types';

const MODEL_NAME = "gemini-1.5-flash";

export const getUnifiedChromatography = async (apiKey: string, smiles: string, imageBase64s: string[]): Promise<UnifiedChromatographyResult> => {
    if (!apiKey) throw new Error("API Key is required.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `请为以下结构开发统一色谱方法：${smiles}`;
    try {
        const result = await model.generateContent([prompt, ...imageBase64s.map(data => ({inlineData: {mimeType: 'image/png', data}}))]);
        const response = await result.response;
        const data = JSON.parse(response.text().replace(/```json/g, '').replace(/```/g, '').trim());
        return { unifiedChromatography: data.unifiedChromatography, references: [] };
    } catch (error) {
        console.error(error);
        throw new Error("无法获取统一色谱方法。");
    }
};
// ... 确保其他函数也使用 GoogleGenerativeAI 类
