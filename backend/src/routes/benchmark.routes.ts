import { Router } from 'express';
import { benchmarkController } from '../controllers/benchmark.controller.js';

export const benchmarkRouter = Router();

// Run benchmark suite (supports both POST and GET for convenience)
benchmarkRouter.post('/run', (req, res) => benchmarkController.runBenchmarks(req, res));
benchmarkRouter.get('/run', (req, res) => benchmarkController.runBenchmarks(req, res));

// Retrieve latest benchmark execution report
benchmarkRouter.get('/latest', (req, res) => benchmarkController.getLatestBenchmark(req, res));

// Retrieve academic NoSQL syllabus evaluation matrix
benchmarkRouter.get('/matrix', (req, res) => benchmarkController.getAcademicMatrix(req, res));

// Data export endpoints
benchmarkRouter.get('/export/csv', (req, res) => benchmarkController.exportCsv(req, res));
benchmarkRouter.get('/export/json', (req, res) => benchmarkController.exportJson(req, res));

// =========================================================================
// Phase 11: Reproducible Benchmarking Routes
// =========================================================================
benchmarkRouter.post('/reproducible/run', (req, res) => benchmarkController.runReproducibleBenchmarks(req, res));
benchmarkRouter.get('/reproducible/run', (req, res) => benchmarkController.runReproducibleBenchmarks(req, res));
benchmarkRouter.get('/reproducible/latest', (req, res) => benchmarkController.getLatestReproducibleReport(req, res));
benchmarkRouter.get('/reproducible/export/csv', (req, res) => benchmarkController.exportReproducibleCsv(req, res));
benchmarkRouter.get('/reproducible/export/json', (req, res) => benchmarkController.exportReproducibleJson(req, res));
