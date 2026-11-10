import { useMemo } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { GraphNode, GraphEdge } from '@/types/api';

interface SimNode extends SimulationNodeDatum {
  id: string;
  label: string;
  risk: number | string;
  x: number;
  y: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  value: number;
}

export function nodeRiskColor(risk: number | string): string {
  if (typeof risk === 'number') {
    if (risk >= 70) return '#E2554F';
    if (risk >= 30) return '#F2A93B';
    return '#1D9C86';
  }
  const norm = risk.toLowerCase();
  if (norm === 'high' || norm === 'severe' || norm === 'critical') return '#E2554F';
  if (norm === 'medium') return '#F2A93B';
  return '#1D9C86';
}

export function DemoGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const W = 340;
  const H = 240;

  const layout = useMemo(() => {
    const simNodes: SimNode[] = nodes.map((n, i) => ({
      ...n,
      x: W / 2 + (i - (nodes.length - 1) / 2) * 40,
      y: H / 2 + (i % 2 === 0 ? -15 : 15),
    }));

    const nodeIds = new Set(simNodes.map(n => n.id));
    const simLinks: SimLink[] = edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(e => ({ source: e.source, target: e.target, value: e.value }));

    const sim = forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          .id(d => d.id)
          .distance(105)
      )
      .force('charge', forceManyBody<SimNode>().strength(-260))
      .force('center', forceCenter(W / 2, H / 2 - 6))
      .force('collide', forceCollide<SimNode>(34))
      .stop();

    for (let i = 0; i < 120; i++) sim.tick();

    // Clamp inside SVG bounds so labels never clip
    for (const n of simNodes) {
      n.x = Math.max(46, Math.min(W - 46, n.x));
      n.y = Math.max(30, Math.min(H - 52, n.y));
    }

    return { simNodes, simLinks };
  }, [nodes, edges]);

  return (
    <div role="img" aria-label="Fund flow graph showing wallet connections">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="w-full h-auto">
        <defs>
          <marker
            id="flow-arrow"
            viewBox="0 0 10 10"
            refX="24"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(23,20,79,0.35)" />
          </marker>
        </defs>

        {layout.simLinks.map((link, i) => {
          const src = link.source as SimNode;
          const tgt = link.target as SimNode;
          return (
            <g key={i}>
              <line
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke="rgba(23,20,79,0.22)"
                strokeWidth={Math.min(4, Math.log(Math.max(link.value, 0) + 1) + 1)}
                markerEnd="url(#flow-arrow)"
              />
              <text
                x={(src.x + tgt.x) / 2}
                y={(src.y + tgt.y) / 2 - 5}
                fontSize="9"
                fill="#5B6178"
                textAnchor="middle"
                fontFamily="DM Mono, monospace"
              >
                {link.value.toFixed(1)}
              </text>
            </g>
          );
        })}

        {layout.simNodes.map(node => {
          const color = nodeRiskColor(node.risk);
          return (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r="18" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
              <circle cx={node.x} cy={node.y} r="7" fill={color} />
              <text
                x={node.x}
                y={node.y + 30}
                fontSize="9"
                fill="#17144F"
                textAnchor="middle"
                fontFamily="DM Mono, monospace"
              >
                {node.label}
              </text>
              <text
                x={node.x}
                y={node.y + 42}
                fontSize="8"
                fill={color}
                textAnchor="middle"
                fontFamily="DM Mono, monospace"
              >
                {String(node.risk)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
