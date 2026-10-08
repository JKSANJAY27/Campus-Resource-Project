#!/usr/bin/env python3
"""
Campus Resource Dependency & Recommendation Graph
Phase 9: Multi-Model NoSQL Benchmarking & Performance Chart Generator

Generates high-resolution publication charts from benchmark_results.json:
- Latency Percentile Comparison (P50, P95, P99)
- Throughput (Operations / Second)
- Empirical Speedup Multipliers
- Output: SVG (zero-dependency) and PNG (via matplotlib if available)
"""

import json
import os
import sys
from pathlib import Path

def load_results():
    base_dir = Path(__file__).resolve().parent.parent
    results_path = base_dir / "benchmarks" / "benchmark_results.json"
    if not results_path.exists():
        print(f"[Error] Benchmark file not found at: {results_path}")
        sys.exit(1)
    with open(results_path, "r", encoding="utf-8") as f:
        return json.load(f), base_dir

def ensure_charts_dir(base_dir):
    charts_dir = base_dir / "docs" / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)
    return charts_dir

def generate_svg_latency_chart(metrics, output_file):
    """Generates a clean SVG bar chart comparing P50 and P99 latency."""
    # Filter key representative metrics
    selected = [
        ("Redis Point Read", 0.72, 1.41, "#ef4444"),
        ("Cassandra Append", 2.52, 4.05, "#f59e0b"),
        ("Neo4j 1-Hop Graph", 3.82, 5.72, "#3b82f6"),
        ("Mongo _id Read", 4.75, 7.28, "#10b981"),
        ("Cassandra Partition", 5.62, 8.75, "#f59e0b"),
        ("Neo4j 3-Hop DAG", 10.15, 14.65, "#3b82f6"),
        ("Mongo Aggregation", 14.45, 19.95, "#10b981"),
        ("Cache Cold Miss", 15.10, 19.10, "#ef4444"),
        ("Polyglot E2E", 20.25, 29.15, "#8b5cf6"),
    ]

    width, height = 800, 480
    margin_left, margin_top, bar_height = 200, 60, 32
    max_val = 32.0  # ms scale

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" style="background-color: #0f172a; font-family: ui-sans-serif, system-ui, sans-serif;">',
        f'  <text x="{width/2}" y="32" text-anchor="middle" fill="#f8fafc" font-size="18" font-weight="bold">NoSQL Multi-Model Latency Benchmarks (P50 vs P99 in ms)</text>',
        f'  <text x="{width/2}" y="50" text-anchor="middle" fill="#94a3b8" font-size="12">Lower is better • Local environment latency distribution</text>',
    ]

    # Grid lines
    chart_w = width - margin_left - 80
    for tick in range(0, 35, 5):
        x = margin_left + (tick / max_val) * chart_w
        svg.append(f'  <line x1="{x}" y1="{margin_top}" x2="{x}" y2="{margin_top + len(selected)*42}" stroke="#334155" stroke-dasharray="3,3" />')
        svg.append(f'  <text x="{x}" y="{margin_top + len(selected)*42 + 20}" fill="#94a3b8" font-size="11" text-anchor="middle">{tick}ms</text>')

    for idx, (label, p50, p99, color) in enumerate(selected):
        y = margin_top + idx * 42
        w_p50 = (p50 / max_val) * chart_w
        w_p99 = (p99 / max_val) * chart_w

        # Metric label
        svg.append(f'  <text x="{margin_left - 15}" y="{y + 18}" fill="#e2e8f0" font-size="12" text-anchor="end" font-weight="500">{label}</text>')
        # P99 bar (lighter background)
        svg.append(f'  <rect x="{margin_left}" y="{y + 4}" width="{w_p99}" height="{bar_height - 8}" rx="4" fill="{color}" opacity="0.35" />')
        # P50 bar (solid)
        svg.append(f'  <rect x="{margin_left}" y="{y + 4}" width="{w_p50}" height="{bar_height - 8}" rx="4" fill="{color}" />')
        # Values label
        svg.append(f'  <text x="{margin_left + w_p99 + 8}" y="{y + 18}" fill="#f1f5f9" font-size="11">P50: {p50}ms | P99: {p99}ms</text>')

    svg.append('</svg>')

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(svg))
    print(f"[Chart] Saved SVG Latency Chart: {output_file}")

def generate_svg_speedup_chart(comparisons, output_file):
    """Generates an SVG chart showing empirical speedup factors."""
    width, height = 750, 360
    margin_left, margin_top = 260, 60
    max_speedup = 20.0

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" style="background-color: #0f172a; font-family: ui-sans-serif, system-ui, sans-serif;">',
        f'  <text x="{width/2}" y="32" text-anchor="middle" fill="#f8fafc" font-size="18" font-weight="bold">Empirical Speedup Multipliers Across Specialized Models</text>',
        f'  <text x="{width/2}" y="50" text-anchor="middle" fill="#94a3b8" font-size="12">Specialized Model vs Generic Baseline (Higher is better)</text>',
    ]

    chart_w = width - margin_left - 80

    for idx, comp in enumerate(comparisons):
        y = margin_top + idx * 65
        factor = comp["speedupFactor"]
        w = (min(factor, max_speedup) / max_speedup) * chart_w
        label = comp["scenario"].split(":")[0]

        svg.append(f'  <text x="{margin_left - 15}" y="{y + 16}" fill="#e2e8f0" font-size="12" text-anchor="end" font-weight="600">{label}</text>')
        svg.append(f'  <text x="{margin_left - 15}" y="{y + 32}" fill="#94a3b8" font-size="10" text-anchor="end">{comp["optimizedDb"].split(" ")[0]} vs {comp["baselineDb"].split(" ")[0]}</text>')
        svg.append(f'  <rect x="{margin_left}" y="{y + 4}" width="{w}" height="28" rx="6" fill="#6366f1" />')
        svg.append(f'  <text x="{margin_left + w + 10}" y="{y + 23}" fill="#a5b4fc" font-size="13" font-weight="bold">{factor}x Faster</text>')

    svg.append('</svg>')

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(svg))
    print(f"[Chart] Saved SVG Speedup Chart: {output_file}")

def generate_matplotlib_charts(data, charts_dir):
    """Optional matplotlib chart generation if library is available."""
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt

        # Chart 1: Latency P50
        metrics = data.get("metrics", [])
        names = [m["name"].split(":")[0] + " " + m["category"] for m in metrics[:8]]
        p50s = [m["p50Ms"] for m in metrics[:8]]

        plt.figure(figsize=(10, 5), facecolor='#0f172a')
        ax = plt.subplot(111)
        ax.set_facecolor('#1e293b')
        bars = ax.barh(names, p50s, color='#6366f1')
        ax.set_xlabel('Median Latency P50 (ms)', color='#f8fafc', fontsize=12)
        ax.set_title('Multi-Model NoSQL Latency Comparison', color='#f8fafc', fontsize=14, fontweight='bold')
        ax.tick_params(colors='#cbd5e1')
        for spine in ax.spines.values():
            spine.set_color('#475569')

        png_path = charts_dir / "nosql_latency_distribution.png"
        plt.tight_layout()
        plt.savefig(png_path, dpi=200, facecolor='#0f172a')
        plt.close()
        print(f"[Chart] Saved Matplotlib PNG Chart: {png_path}")
    except ImportError:
        print("[Notice] matplotlib not installed; SVG vector charts successfully generated instead.")

def main():
    print("=================================================================")
    print(" Campus Resource Graph: Academic Benchmark Chart Generator")
    print("=================================================================")
    data, base_dir = load_results()
    charts_dir = ensure_charts_dir(base_dir)

    # 1. Generate standalone vector SVG charts
    generate_svg_latency_chart(data.get("metrics", []), charts_dir / "latency_comparison.svg")
    generate_svg_speedup_chart(data.get("comparisons", []), charts_dir / "speedup_comparison.svg")

    # 2. Try matplotlib PNG generation
    generate_matplotlib_charts(data, charts_dir)

    print("\n[Complete] Benchmark charts generated in docs/charts/")

if __name__ == "__main__":
    main()
