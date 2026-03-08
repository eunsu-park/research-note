"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import type { GraphData, GraphNode, GraphEdge } from "@/types/note.types";
import { useTheme } from "next-themes";

interface KnowledgeGraphProps {
  data: GraphData;
  className?: string;
}

interface SimNode extends d3.SimulationNodeDatum, GraphNode {}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string;
  target: SimNode | string;
}

export function KnowledgeGraph({ data, className = "" }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const drawGraph = useCallback(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const isDark = resolvedTheme === "dark";

    const colors = {
      node: isDark ? "#a78bfa" : "#7c3aed",
      nodeHover: isDark ? "#c4b5fd" : "#5b21b6",
      link: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
      text: isDark ? "#e5e7eb" : "#374151",
      bg: isDark ? "#1a1a2e" : "#fafafa",
    };

    // Create simulation nodes and links
    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const links: SimLink[] = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Add zoom behavior
    const g = svg.append("g");

    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        }) as never
    );

    // Draw links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", colors.link)
      .attr("stroke-width", 1.5);

    // Draw nodes
    const node = g
      .append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => Math.max(6, Math.min(16, 6 + d.linkCount * 2)))
      .attr("fill", colors.node)
      .attr("stroke", colors.bg)
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        router.push(`/notes/${d.id}`);
      })
      .on("mouseover", function () {
        d3.select(this).attr("fill", colors.nodeHover);
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill", colors.node);
      })
      .call(
        d3
          .drag<SVGCircleElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active)
              simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active)
              simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Draw labels
    const label = g
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.title)
      .attr("font-size", 11)
      .attr("dx", 18)
      .attr("dy", 4)
      .attr("fill", colors.text)
      .style("pointer-events", "none");

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x || 0)
        .attr("y1", (d) => (d.source as SimNode).y || 0)
        .attr("x2", (d) => (d.target as SimNode).x || 0)
        .attr("y2", (d) => (d.target as SimNode).y || 0);

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);

      label.attr("x", (d) => d.x || 0).attr("y", (d) => d.y || 0);
    });

    return () => {
      simulation.stop();
    };
  }, [data, resolvedTheme, router]);

  useEffect(() => {
    const cleanup = drawGraph();
    return () => cleanup?.();
  }, [drawGraph]);

  // Redraw on resize
  useEffect(() => {
    const observer = new ResizeObserver(() => drawGraph());
    if (svgRef.current) observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, [drawGraph]);

  return (
    <svg
      ref={svgRef}
      className={`w-full h-full ${className}`}
      style={{ minHeight: 400 }}
    />
  );
}
