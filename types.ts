
export interface SingleComponentAnalysis {
  componentId: string; // e.g., "Component 1 (from SMILES)" or "Component 2 (from image)"
  basicProfile: {
    formula: string;
    molecularWeight: number;
    iupacName: string; // English IUPAC Name
    chineseName: string; // Chinese Name
  };
  physicochemical: {
    phLogD: {
      trendDescription: string;
      phLogDCurveImage?: string; // Base64 encoded image, now optional
      pkaPoints: string;
    };
    nmr: {
      prediction: string;
    };
    ms: {
      prediction: string;
    };
  };
  structureAnalysis: {
    isomers: {
      chiralCenters: string;
      geometricIsomers: string;
      separationNotes: string;
    };
    tautomers: {
      hasTautomers: boolean;
      description: string;
      chromatographicEffects: string;
    };
  };
  toxicology: {
    ichM7: {
      alerts: string;
      classification: string;
    };
    td50: {
      value: string;
      ai: string;
    };
    nitrosamine: {
      isNitrosamine: boolean;
      cpcaClass: string;
      aiLimit: string;
    };
  };
}

export interface UnifiedChromatography {
    summary: string; // Overall strategy summary
    technique: {
      recommendation: 'HPLC' | 'GC';
      justification: string;
    };
    stationaryPhase: {
      recommendation: string;
    };
    mobilePhase: {
      pumpA: string;
      pumpB: string;
      phRange: string;
      gradient: string; // Recommended gradient profile
    };
    detector: {
      recommendation: string;
      settings: string;
    };
}

export interface AnalysisResult {
  unifiedChromatography: UnifiedChromatography;
  components: SingleComponentAnalysis[];
}
