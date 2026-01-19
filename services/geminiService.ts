import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { UnifiedChromatographyResult, SingleComponentAnalysisResult, SingleComponentAnalysis, UnifiedChromatography, Reference } from '../types';

// 定义稳定模型名称
const MODEL_NAME = 'gemini-1.5-flash';

// --- 定义所有必要的 Schema，防止构建报错 ---
const singleComponentSchema = {
    type: Type.OBJECT,
    properties: {
        componentId: { type: Type.STRING },
        basicProfile: {
            type: Type.OBJECT,
            properties: {
                formula: { type: Type.STRING },
                molecularWeight: { type: Type.NUMBER },
                iupacName: { type: Type.STRING },
                chineseName: { type: Type.STRING },
                casNumber: { type: Type.STRING },
            },
            required: ["formula", "molecularWeight", "iupacName", "chineseName", "casNumber"]
        },
        physicochemical: {
            type: Type.OBJECT,
            properties: {
                phLogD: {
                    type: Type.OBJECT,
                    properties: { trendDescription: { type: Type.STRING }, pkaPoints: { type: Type.STRING } },
                    required: ["trendDescription", "pkaPoints"]
                },
                nmr: { type: Type.OBJECT, properties: { prediction: { type: Type.STRING } }, required: ["prediction"] },
                ms: { type: Type.OBJECT, properties: { prediction: { type: Type.STRING } }, required: ["prediction"] }
            },
            required: ["phLogD", "nmr", "ms"]
        },
        structureAnalysis: {
            type: Type.OBJECT,
            properties: {
                isomers: { type: Type.OBJECT, properties: { chiralCenters: { type: Type.STRING }, geometricIsomers: { type: Type.STRING }, separationNotes: { type: Type.STRING } }, required: ["chiralCenters", "geometricIsomers", "separationNotes"] },
                tautomers: { type: Type.OBJECT, properties: { hasTautomers: { type: Type.BOOLEAN }, description: { type: Type.STRING }, chromatographicEffects: { type: Type.STRING } }, required: ["hasTautomers", "description", "chromatographicEffects"] }
            },
            required: ["isomers", "tautomers"]
        },
        toxicology: {
            type: Type.OBJECT,
            properties: {
                ichM7: { type: Type.OBJECT, properties: { alerts: { type: Type.STRING }, classification: { type: Type.STRING } }, required: ["alerts", "classification"] },
                td50: { type: Type.OBJECT, properties: { value: { type: Type.STRING }, source: { type: Type.STRING }, ai: { type: Type.STRING } }, required: ["value", "source", "ai"] },
                nitrosamine: { type: Type.OBJECT, properties: { isNitrosamine: { type: Type.BOOLEAN }, cpcaClass: { type: Type.STRING }, aiLimit: { type: Type.STRING }, guidelineReference: { type: Type.STRING } }, required: ["isNitrosamine", "cpcaClass", "aiLimit", "guidelineReference"] }
            },
            required: ["ichM7", "td50", "nitrosamine"]
        }
    },
    required: ["componentId", "basicProfile", "physicochemical", "structureAnalysis", "toxicology"]
};

const unifiedChromatographySchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING },
        technique: { type: Type.OBJECT, properties: { recommendation: { type: Type.STRING }, justification: { type: Type.STRING } }, required: ["recommendation", "justification"] },
        stationaryPhase: { type: Type.OBJECT, properties: { recommendation: { type: Type.STRING } }, required: ["recommendation"] },
        mobilePhase: { type: Type.OBJECT, properties: { pumpA: { type: Type.STRING }, pumpB: { type: Type.STRING }, phRange: { type: Type.STRING }, gradient: { type: Type.STRING } }, required: ["pumpA", "pumpB", "phRange", "gradient"] },
        detector: { type: Type.OBJECT, properties: { recommendation: { type: Type.STRING }, settings: { type: Type.STRING } }, required: ["recommendation", "settings"] }
    },
    required: ["summary", "technique", "stationaryPhase", "mobilePhase", "detector"]
};

// --- 辅助函数 ---
function parseAndExtractReferences(response: GenerateContentResponse): { data: any, references: Reference[] } {
    const text = response.text;
    if (!text) throw new Error("API返回了空响应。");
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

// --- 导出函数 ---
export const getUnifiedChromatography = async (apiKey: string, smiles: string, imageBase64s: string[]): Promise<UnifiedChromatographyResult> => {
    if (!apiKey) throw new Error("API Key is required.");
    const ai = new GoogleGenAI({ apiKey });
    const parts: any[] = [{ text: `为以下结构开发统一色谱方法：\n${smiles}` }];
    imageBase64s.forEach(img => parts.push({ inlineData: { mimeType: 'image/png', data: img } }));

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: { parts },
            config: {
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
        return { unifiedChromatography: data.unifiedChromatography, references };
    } catch (error) {
        throw new Error("无法获取统一色谱方法。");
    }
};

export const getSingleComponentAnalysis = async (apiKey: string, input: { smiles?: string; imageBase64?: string }, componentId: string): Promise<SingleComponentAnalysisResult> => {
    if (!apiKey) throw new Error("API Key is required.");
    const ai = new GoogleGenAI({ apiKey });
    const parts: any[] = [{ text: `详细分析报告 ID: ${componentId}。SMILES: ${input.smiles || '见图'}` }];
    if (input.imageBase64) parts.push({ inlineData: { mimeType: 'image/png', data: input.imageBase64 } });

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: { parts },
            config: {
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
        return { component: data.component, references };
    } catch (error) {
        throw new Error(`组分 ${componentId} 的分析失败。`);
    }
};

export const generateCurveForStructure = async (apiKey: string, input: { smiles?: string; imageBase64?: string }): Promise<string> => {
    if (!apiKey) throw new Error("API Key is required.");
    const ai = new GoogleGenAI({ apiKey });
    const parts: any[] = [{ text: "生成 pH-logD 曲线图 Base64 编码的 PNG。" }];
    if (input.smiles) parts.push({ text: input.smiles });
    if (input.imageBase64) parts.push({ inlineData: { mimeType: 'image/png', data: input.imageBase64 } });

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { phLogDCurveImage: { type: Type.STRING } }, required: ["phLogDCurveImage"] }
            },
        });
        const data = JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, '').trim());
        return data.phLogDCurveImage;
    } catch (error) {
        throw new Error("无法生成曲线图。");
    }
};
