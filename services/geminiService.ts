
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { UnifiedChromatographyResult, SingleComponentAnalysisResult, SingleComponentAnalysis, UnifiedChromatography, Reference } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const singleComponentSchema = {
    type: Type.OBJECT,
    properties: {
        componentId: { type: Type.STRING, description: "组分的唯一标识符，例如 '组分 1 (来自 SMILES)' 或 '组分 2 (来自图片 1)'。" },
        basicProfile: {
          type: Type.OBJECT,
          properties: {
            formula: { type: Type.STRING, description: "分子式" },
            molecularWeight: { type: Type.NUMBER, description: "精确分子量" },
            iupacName: { type: Type.STRING, description: "标准的英文IUPAC名称。" },
            chineseName: { type: Type.STRING, description: "对应的中文化学名称。" },
            casNumber: { type: Type.STRING, description: "化学文摘社（CAS）注册号。" },
          },
          required: ["formula", "molecularWeight", "iupacName", "chineseName", "casNumber"]
        },
        physicochemical: {
          type: Type.OBJECT,
          properties: {
            phLogD: {
              type: Type.OBJECT,
              properties: {
                trendDescription: { type: Type.STRING, description: "对pH-logD曲线的文字解读，解释疏水性变化。" },
                pkaPoints: { type: Type.STRING, description: "识别出的pKa值。" }
              },
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
                isomers: {
                    type: Type.OBJECT,
                    properties: {
                        chiralCenters: { type: Type.STRING },
                        geometricIsomers: { type: Type.STRING },
                        separationNotes: { type: Type.STRING },
                    },
                    required: ["chiralCenters", "geometricIsomers", "separationNotes"]
                },
                tautomers: {
                    type: Type.OBJECT,
                    properties: {
                        hasTautomers: { type: Type.BOOLEAN },
                        description: { type: Type.STRING },
                        chromatographicEffects: { type: Type.STRING },
                    },
                    required: ["hasTautomers", "description", "chromatographicEffects"]
                }
            },
            required: ["isomers", "tautomers"]
        },
        toxicology: {
            type: Type.OBJECT,
            properties: {
                ichM7: { type: Type.OBJECT, properties: { alerts: { type: Type.STRING }, classification: { type: Type.STRING } }, required: ["alerts", "classification"] },
                td50: { type: Type.OBJECT, properties: { value: { type: Type.STRING }, source: { type: Type.STRING, description: "TD50值的数据来源，例如'CPDB (致癌效力数据库)'。" }, ai: { type: Type.STRING } }, required: ["value", "source", "ai"] },
                nitrosamine: { type: Type.OBJECT, properties: { isNitrosamine: { type: Type.BOOLEAN }, cpcaClass: { type: Type.STRING }, aiLimit: { type: Type.STRING }, guidelineReference: { type: Type.STRING, description: "亚硝胺AI限度的参考指南，例如 'EMA/CHMP/SWP/44272/2019' 或 'FDA 指南'。" } }, required: ["isNitrosamine", "cpcaClass", "aiLimit", "guidelineReference"] }
            },
            required: ["ichM7", "td50", "nitrosamine"]
        }
    },
    required: ["componentId", "basicProfile", "physicochemical", "structureAnalysis", "toxicology"]
};

const unifiedChromatographySchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "能够分离所有组分的色谱策略的总体摘要。" },
        technique: { type: Type.OBJECT, properties: { recommendation: { type: Type.STRING }, justification: { type: Type.STRING } }, required: ["recommendation", "justification"] },
        stationaryPhase: { type: Type.OBJECT, properties: { recommendation: { type: Type.STRING } }, required: ["recommendation"] },
        mobilePhase: { type: Type.OBJECT, properties: { pumpA: { type: Type.STRING }, pumpB: { type: Type.STRING }, phRange: { type: Type.STRING }, gradient: { type: Type.STRING, description: "推荐的梯度洗脱程序，例如 '从10% B开始，在20分钟内线性增加到90% B'。" } }, required: ["pumpA", "pumpB", "phRange", "gradient"] },
        detector: { type: Type.OBJECT, properties: { recommendation: { type: Type.STRING }, settings: { type: Type.STRING } }, required: ["recommendation", "settings"] }
    },
    required: ["summary", "technique", "stationaryPhase", "mobilePhase", "detector"]
};


function parseAndExtractReferences(response: GenerateContentResponse): { data: any, references: Reference[] } {
    const text = response.text;
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

export const getUnifiedChromatography = async (smiles: string, imageBase64s: string[]): Promise<UnifiedChromatographyResult> => {
    const model = 'gemini-3-flash-preview';
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

export const getSingleComponentAnalysis = async (input: { smiles?: string; imageBase64?: string }, componentId: string): Promise<SingleComponentAnalysisResult> => {
    const model = 'gemini-3-flash-preview';
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
                systemInstruction: `你是一个世界级的化学分析专家。你的任务是为一个化学结构提供详细的、独立的分析报告。
                你必须严格遵守以下规则：
                1. **Python绘图**: 请勿生成pH-logD曲线图。只提供文字描述和pKa点。
                2. **输出语言**: 所有输出必须使用专业、科学的中文。
                3. **格式**: 对化学符号使用普通文本。对于化学名称，必须提供英文IUPAC名、中文名和CAS号。
                4. **关键数据验证 (!!!)**: 你必须使用提供的Google Search工具来主动搜索和验证以下关键数据点：CAS号、TD50值、亚硝胺CPCA分类和AI限度。绝对不能仅依赖你的内部知识库。
                5. **毒理学数据准确性**: 对于TD50值，必须优先参考致癌效力数据库(CPDB)的数据。对于亚硝胺AI限度，必须依据最新的权威指南（如EMA、FDA）进行评估。
                6. **JSON Schema**: 严格遵循请求的JSON输出格式，将 '${componentId}' 作为componentId字段的值。`,
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


export const generateCurveForStructure = async (input: { smiles?: string; imageBase64?: string }): Promise<string> => {
    const model = 'gemini-3-flash-preview';
  
    const prompt = `使用Python matplotlib为以下化学结构生成pH 1.0 - 14.0范围内的log D曲线图。在图上标出pKa点。将生成的图作为Base64编码的PNG字符串在JSON中返回。`;
    const parts: any[] = [{ text: prompt }];
  
    if (input.smiles) {
      parts.push({ text: `SMILES: ${input.smiles}` });
    } else if (input.imageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: input.imageBase64,
        },
      });
    } else {
      throw new Error("Either SMILES or imageBase64 must be provided.");
    }
  
    const curveSchema = {
      type: Type.OBJECT,
      properties: {
        phLogDCurveImage: {
          type: Type.STRING,
          description: "pH 1.0-14.0范围内的log D曲线的Base64编码PNG图像。"
        }
      },
      required: ["phLogDCurveImage"]
    };
  
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: curveSchema,
        },
      });
  
      const text = response.text;
      if (!text) {
        throw new Error("API returned an empty response for the curve generation.");
      }
      const result = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
      return result.phLogDCurveImage;
  
    } catch (error) {
      console.error("Gemini API call for curve generation failed:", error);
      throw new Error("无法生成pH-LogD曲线图。");
    }
  };
