
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { AnalysisResult } from '../types';

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

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    unifiedChromatography: {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: "能够分离所有组分的色谱策略的总体摘要。" },
            technique: { type: Type.OBJECT, properties: { recommendation: { type: Type.STRING }, justification: { type: Type.STRING } }, required: ["recommendation", "justification"] },
            stationaryPhase: { type: Type.OBJECT, properties: { recommendation: { type: Type.STRING } }, required: ["recommendation"] },
            mobilePhase: { type: Type.OBJECT, properties: { pumpA: { type: Type.STRING }, pumpB: { type: Type.STRING }, phRange: { type: Type.STRING }, gradient: { type: Type.STRING, description: "推荐的梯度洗脱程序，例如 '从10% B开始，在20分钟内线性增加到90% B'。" } }, required: ["pumpA", "pumpB", "phRange", "gradient"] },
            detector: { type: Type.OBJECT, properties: { recommendation: { type: Type.STRING }, settings: { type: Type.STRING } }, required: ["recommendation", "settings"] }
        },
        required: ["summary", "technique", "stationaryPhase", "mobilePhase", "detector"]
    },
    components: {
        type: Type.ARRAY,
        items: singleComponentSchema
    }
  },
  required: ["unifiedChromatography", "components"]
};

const systemInstruction = `你是一个世界级的“多组分色谱方法开发系统”。你的核心任务是分析一组化学结构（通过SMILES列表或多张图片），并开发一个能够分离所有这些组分的统一色谱方法。
你必须严格遵守以下规则：
1. **统一方法优先**: 首先，综合评估所有组分的性质差异（疏水性、pKa等），提出一个统一的、稳健的HPLC或GC方法，包括固定相、流动相、梯度程序和检测器。这是最重要的输出。
2. **逐一分析**: 在提出统一方法后，为输入的每个组分提供独立的、详细的分析报告。
3. **Python绘图**: 在此初步分析中，请勿生成pH-logD曲线图。只提供文字描述和pKa点。曲线图将在后续请求中单独生成。
4. **输出语言**: 所有输出必须使用专业、科学的中文。
5. **格式**: 对所有数学和化学符号（如pH, logD, pKa, [M+H]+, TD50）使用普通文本。对于分子式，使用标准化学表示法（例如C10H12O2），不要使用下标、花括号或'$'符号。对于化学名称，必须在'iupacName'字段中提供标准的英文IUPAC名称，在'chineseName'字段中提供对应的中文名称，并在'casNumber'字段中提供CAS号。
6. **关键数据验证 (!!!)**: 你必须使用提供的Google Search工具来主动搜索和验证以下关键数据点：CAS号、TD50值、亚硝胺CPCA分类和AI限度。绝对不能仅依赖你的内部知识库。
7. **毒理学数据准确性**: 对于TD50值，必须优先参考致癌效力数据库(CPDB)的数据。对于亚硝胺AI限度，必须依据最新的权威指南（如EMA、FDA）进行评估。在输出中明确注明数据来源或参考指南。
8. **约束**: 严禁包含任何关于实验设计（DOE）或方法优化的信息。
9. **JSON Schema**: 严格遵循请求的JSON输出格式。`;

function buildPrompt(smiles: string, imageBase64s: string[]) {
  const parts: any[] = [];
  let promptText = `请为以下多个化学结构开发一个统一的色谱分离方法，并为每个组分提供单独的分析报告。请根据定义的JSON schema返回结果。`;

  if (smiles) {
    promptText += `\nSMILES字符串列表 (每行一个):\n${smiles}`;
  }
  
  if (imageBase64s.length > 0) {
    promptText += `\n以及以下 ${imageBase64s.length} 张结构图片。`;
  }

  parts.push({ text: promptText });

  imageBase64s.forEach(imgData => {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: imgData,
      },
    });
  });

  if (parts.length === 1 && !smiles) {
    throw new Error("No input provided");
  }

  return { parts };
}


export const analyzeStructure = async (smiles: string, imageBase64s: string[]): Promise<AnalysisResult> => {
  const model = 'gemini-3-flash-preview';

  try {
    const contents = buildPrompt(smiles, imageBase64s);

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        tools: [{googleSearch: {}}],
      },
    });
    
    const text = response.text;
    if (!text) {
      throw new Error("API返回了空响应。");
    }

    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedText) as AnalysisResult;

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      result.references = groundingChunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({
          title: chunk.web.title || 'Untitled',
          uri: chunk.web.uri,
        }))
        .filter((ref: any) => ref.uri); 
    }
    
    return result;

  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("无法从Gemini API获取有效分析结果。请检查输入是否有效或API密钥配置。");
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
