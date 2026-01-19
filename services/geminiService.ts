import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { UnifiedChromatographyResult, SingleComponentAnalysisResult, SingleComponentAnalysis, UnifiedChromatography, Reference } from '../types';

// 辅助函数：解析响应并提取参考资料
function parseAndExtractReferences(response: any): { data: any, references: Reference[] } {
    const text = response.text();
    if (!text) {
        throw new Error("API返回了空响应。");
    }
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanedText);

    const references: Reference[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
        references.push(...groundingChunks
            .filter((chunk: any) => chunk.web)
            .map((chunk: any) => ({
                title: chunk.web.title || 'Untitled',
                uri: chunk.web.uri,
            }))
            .filter((ref: any) => ref.uri)
        );
    }
    return { data, references };
}

// 1. 获取统一色谱方法
export const getUnifiedChromatography = async (apiKey: string, smiles: string, imageBase64s: string[]): Promise<UnifiedChromatographyResult> => {
    if (!apiKey) throw new Error("API Key is required.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    let promptText = `请为以下化学结构开发一个统一的色谱分离方法：\n${smiles}`;
    const parts = [{ text: promptText }];
    imageBase64s.forEach(imgData => parts.push({ inlineData: { mimeType: 'image/png', data: imgData } } as any));

    try {
        const result = await model.generateContent(parts);
        const { data, references } = parseAndExtractReferences(result.response);
        return { unifiedChromatography: data.unifiedChromatography as UnifiedChromatography, references };
    } catch (error) {
        console.error("Gemini API error:", error);
        throw new Error("无法获取统一色谱方法。");
    }
};

// 2. 获取单组分分析报告
export const getSingleComponentAnalysis = async (apiKey: string, input: { smiles?: string; imageBase64?: string }, componentId: string): Promise<SingleComponentAnalysisResult> => {
    if (!apiKey) throw new Error("API Key is required.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const parts = [{ text: `请为ID为 '${componentId}' 的结构提供详细分析报告。SMILES: ${input.smiles || '见图片'}` }];
    if (input.imageBase64) {
        parts.push({ inlineData: { mimeType: 'image/png', data: input.imageBase64 } } as any);
    }

    try {
        const result = await model.generateContent(parts);
        const { data, references } = parseAndExtractReferences(result.response);
        return { component: data.component as SingleComponentAnalysis, references };
    } catch (error) {
        console.error(`Analysis failed for ${componentId}:`, error);
        throw new Error(`组分 ${componentId} 的分析失败。`);
    }
};

// 3. 生成 pH-LogD 曲线图
export const generateCurveForStructure = async (apiKey: string, input: { smiles?: string; imageBase64?: string }): Promise<string> => {
    if (!apiKey) throw new Error("API Key is required.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `使用Python为以下结构生成pH 1.0 - 14.0的log D曲线图，返回Base64编码的PNG。`;
    const parts = [{ text: prompt }];
    if (input.smiles) parts.push({ text: `SMILES: ${input.smiles}` });
    if (input.imageBase64) parts.push({ inlineData: { mimeType: 'image/png', data: input.imageBase64 } } as any);

    try {
        const result = await model.generateContent(parts);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{.*\}/s);
        const data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);
        return data.phLogDCurveImage;
    } catch (error) {
        console.error("Curve generation failed:", error);
        throw new Error("无法生成曲线图。");
    }
};
