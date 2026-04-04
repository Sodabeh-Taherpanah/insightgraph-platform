import { Controller, Get } from '@nestjs/common';
import { graph } from '../services/graphService';

@Controller('graph')
export class GraphController {
  @Get()
  async getGraph() {
    try {
      const nodes = (graph as any).nodes || [];
      const edges = (graph as any).edges || [];
      return { nodes, edges };
    } catch {
      return { nodes: [], edges: [] };
    }
  }
}
