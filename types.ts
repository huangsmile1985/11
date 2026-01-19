
export interface SingleComponentAnalysis {
  componentId: string; // e.g., "Component 1 (from SMILES)" or "Component 2 (from image)"
  basicProfile: {
    formula: string;
    molecularWeight: number;
    iupacName: string; // English IUPAC Name
    chineseName: string; // Chinese Name
    casNumber: string; // CAS Registry Number
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
      source: string; // Data source, e.g., "CPDB (Carcinogenic Potency Database)"
      ai: string;
    };
    nitrosamine: {
      isNitrosamine: boolean;
      cpcaClass: string;
      aiLimit: string;
      guidelineReference: string; // Guideline reference, e.g., "EMA/CHMP/SWP/44272/2019"
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

export interface Reference {
    title: string;
    uri: string;
}

export interface UnifiedChromatographyResult {
    unifiedChromatography: UnifiedChromatography;
    references?: Reference[];
}

export interface SingleComponentAnalysisResult {
    component: SingleComponentAnalysis;
    references?: Reference[];
}

export interface AnalysisResult {
  unifiedChromatography: UnifiedChromatography | null;
  components: (SingleComponentAnalysis | { status: 'loading'; componentId: string } | { status: 'error'; componentId: string; message: string })[];
  references: Reference[];
}
