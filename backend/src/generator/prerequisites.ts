import { SkillDefinition } from './ontology.js';

/**
 * Validates that a directed graph defined by adjacency list has zero cycles (is a strict DAG).
 * Uses Kahn's algorithm (topological sorting by in-degree).
 */
export function validateGraphIsDAG(nodes: string[], adjList: Map<string, string[]>): { isDAG: boolean; cycleNodes?: string[] } {
  const inDegree = new Map<string, number>();
  nodes.forEach((n) => inDegree.set(n, 0));

  for (const [, targets] of adjList.entries()) {
    for (const target of targets) {
      inDegree.set(target, (inDegree.get(target) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [node, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(node);
    }
  }

  let visitedCount = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visitedCount++;

    const neighbors = adjList.get(current) || [];
    for (const neighbor of neighbors) {
      const updated = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, updated);
      if (updated === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (visitedCount === nodes.length) {
    return { isDAG: true };
  }

  const cycleNodes = nodes.filter((n) => (inDegree.get(n) || 0) > 0);
  return { isDAG: false, cycleNodes };
}

/**
 * Computes all transitive upstream prerequisites for a given skill or entity.
 */
export function getTransitivePrerequisites(targetId: string, directPrereqsMap: Map<string, string[]>): Set<string> {
  const visited = new Set<string>();
  const queue = [...(directPrereqsMap.get(targetId) || [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!visited.has(current)) {
      visited.add(current);
      const upstream = directPrereqsMap.get(current) || [];
      for (const u of upstream) {
        if (!visited.has(u)) {
          queue.push(u);
        }
      }
    }
  }

  return visited;
}

/**
 * Builds a validated skill prerequisite map from curated definitions.
 */
export function buildSkillPrerequisiteMap(skills: SkillDefinition[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  skills.forEach((s) => {
    map.set(s.id, [...s.prerequisites]);
  });

  // Verify DAG
  const adj = new Map<string, string[]>();
  skills.forEach((s) => adj.set(s.id, []));
  skills.forEach((s) => {
    s.prerequisites.forEach((p) => {
      // p -> s edge (p is prerequisite of s)
      const list = adj.get(p) || [];
      list.push(s.id);
      adj.set(p, list);
    });
  });

  const check = validateGraphIsDAG(
    skills.map((s) => s.id),
    adj
  );
  if (!check.isDAG) {
    throw new Error(`Cycle detected in curated skills! Offending nodes: ${check.cycleNodes?.join(', ')}`);
  }

  return map;
}
