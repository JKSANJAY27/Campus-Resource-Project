export type DatasetScale = '1K' | '5K' | '10K' | '50K' | '100K';

export interface BenchmarkScenarioResult {
  database: 'MongoDB' | 'Neo4j' | 'Redis' | 'Cassandra' | 'Application';
  operation: string;
  description: string;
  datasetScale: DatasetScale;
  runs: number;
  warmupRuns: number;
  avgMs: number;
  medianMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  throughputOpsSec: number;
  environment: {
    isLiveDb: boolean;
    nodeVersion: string;
    platform: string;
  };
  notes: string;
  rawSamplesMs?: number[];
}

export interface FairComparisonItem {
  accessPattern: string;
  bestFitDatabase: string;
  whyBestFit: string;
  unsuitableDatabase: string;
  whyUnsuitable: string;
}

export interface ReproducibleBenchmarkReport {
  reportId: string;
  timestamp: string;
  datasetScale: DatasetScale;
  warmupIterations: number;
  measurementIterations: number;
  environmentalFactors: {
    os: string;
    nodeVersion: string;
    platform: string;
    hardwareNotes: string;
    environmentalLimitations: string;
  };
  results: BenchmarkScenarioResult[];
  fairComparisonMatrix: FairComparisonItem[];
}
