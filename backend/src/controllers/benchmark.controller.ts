import { Request, Response } from 'express';
import { benchmarkService } from '../services/benchmark.service.js';
import { reproducibleRunner } from '../benchmark/runner.js';

export class BenchmarkController {
  public async runBenchmarks(req: Request, res: Response): Promise<void> {
    try {
      const iterationsParam = req.query.iterations || req.body.iterations;
      let iterations = iterationsParam ? parseInt(String(iterationsParam), 10) : 25;
      if (isNaN(iterations) || iterations < 5) iterations = 5;
      if (iterations > 200) iterations = 200; // safety ceiling for laptop responsiveness

      const result = await benchmarkService.runFullSuite(iterations);
      res.json({
        success: true,
        message: `Successfully executed multi-model NoSQL benchmark suite across ${iterations} iterations per workload.`,
        data: result,
      });
    } catch (err: any) {
      console.error('[BenchmarkController.runBenchmarks] Error:', err);
      res.status(500).json({
        success: false,
        error: 'BenchmarkExecutionError',
        message: err.message || 'Failed to complete benchmark suite execution.',
      });
    }
  }

  public getLatestBenchmark(_req: Request, res: Response): void {
    try {
      const result = benchmarkService.getLatestResult();
      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'InternalError',
        message: err.message,
      });
    }
  }

  public getAcademicMatrix(_req: Request, res: Response): void {
    try {
      const matrix = benchmarkService.getAcademicMatrix();
      res.json({
        success: true,
        count: matrix.length,
        data: matrix,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'InternalError',
        message: err.message,
      });
    }
  }

  public exportCsv(_req: Request, res: Response): void {
    try {
      const csv = benchmarkService.exportAsCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="nosql_benchmark_report.csv"');
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'ExportError',
        message: err.message,
      });
    }
  }

  public exportJson(_req: Request, res: Response): void {
    try {
      const json = benchmarkService.exportAsJson();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="nosql_benchmark_report.json"');
      res.send(json);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'ExportError',
        message: err.message,
      });
    }
  }

  // =========================================================================
  // Phase 11: Reproducible Benchmarking Handlers
  // =========================================================================
  public async runReproducibleBenchmarks(req: Request, res: Response): Promise<void> {
    try {
      const scaleParam = (req.query.scale || req.body.scale || '10K') as any;
      const validScales = ['1K', '5K', '10K', '50K', '100K'];
      const scale = validScales.includes(scaleParam) ? scaleParam : '10K';

      const runsParam = req.query.runs || req.body.runs;
      let runs = runsParam ? parseInt(String(runsParam), 10) : 25;
      if (isNaN(runs) || runs < 5) runs = 5;
      if (runs > 100) runs = 100;

      const warmupParam = req.query.warmup || req.body.warmup;
      let warmup = warmupParam ? parseInt(String(warmupParam), 10) : 5;
      if (isNaN(warmup) || warmup < 1) warmup = 1;
      if (warmup > 20) warmup = 20;

      const report = await reproducibleRunner.runFullSuite(scale, runs, warmup);
      res.json({
        success: true,
        message: `Successfully executed reproducible benchmark suite across 18 experiments at scale ${scale} with ${warmup} warmup and ${runs} measured runs.`,
        data: report,
      });
    } catch (err: any) {
      console.error('[BenchmarkController.runReproducibleBenchmarks] Error:', err);
      res.status(500).json({
        success: false,
        error: 'ReproducibleBenchmarkExecutionError',
        message: err.message || 'Failed to execute reproducible benchmark suite.',
      });
    }
  }

  public getLatestReproducibleReport(_req: Request, res: Response): void {
    try {
      const report = reproducibleRunner.getLatestReport();
      res.json({
        success: true,
        data: report,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'InternalError',
        message: err.message,
      });
    }
  }

  public exportReproducibleCsv(_req: Request, res: Response): void {
    try {
      const csv = reproducibleRunner.exportReportAsCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="reproducible_benchmark_report.csv"');
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'ExportError',
        message: err.message,
      });
    }
  }

  public exportReproducibleJson(_req: Request, res: Response): void {
    try {
      const json = reproducibleRunner.exportReportAsJson();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="reproducible_benchmark_report.json"');
      res.send(json);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'ExportError',
        message: err.message,
      });
    }
  }
}

export const benchmarkController = new BenchmarkController();
