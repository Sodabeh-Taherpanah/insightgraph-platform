import fs from 'fs';
import path from 'path';

// Ensure data directory exists
const dataDir = path.resolve('./data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory:', dataDir);
}

const graphFile = path.join(dataDir, 'graph.json');

// Fallback minimal in-memory Graph implementation with JSON persistence
class FallbackGraph {
  public nodes: any[] = [];
  public edges: any[] = [];

  constructor() {
    this.load();
  }

  private save() {
    try {
      fs.writeFileSync(
        graphFile,
        JSON.stringify({ nodes: this.nodes, edges: this.edges }, null, 2)
      );
    } catch (e) {
      console.error('Failed to save graph:', e);
    }
  }

  private load() {
    try {
      if (fs.existsSync(graphFile)) {
        const data = JSON.parse(fs.readFileSync(graphFile, 'utf8'));
        this.nodes = data.nodes || [];
        this.edges = data.edges || [];
      }
    } catch (e) {
      console.error('Failed to load graph:', e);
    }
  }

  async addNode(data: any) {
    const id = data.label || Math.random().toString(36);
    const node = { id, ...data };
    this.nodes.push(node);
    this.save();
    return { id };
  }

  async addEdge(data: any) {
    const id = Math.random().toString(36);
    const edge = { id, ...data };
    this.edges.push(edge);
    this.save();
    return { id };
  }
}

export const graph = new FallbackGraph();

// Initialize the graph (async, but export the promise or handle in routes)
export const initializeGraph = async () => {
  console.log('🧠 Fallback Graph initialized with persistence.');

  // Add demo data if empty
  if (graph.nodes.length === 0) {
    try {
      const ai = await graph.addNode({
        type: 'TOPIC',
        label: 'AI',
        properties: { description: 'Artificial Intelligence' },
      });
      const kg = await graph.addNode({
        type: 'CONCEPT',
        label: 'Knowledge Graphs',
        properties: { description: 'Graph-based data representation' },
      });
      await graph.addEdge({
        fromNodeId: ai.id,
        toNodeId: kg.id,
        type: 'RELATION',
        properties: { relation: 'uses' },
      });
      console.log('✅ Demo data added to graph.');
    } catch (e) {
      console.error('❌ Failed to add demo data:', e);
    }
  }
};
