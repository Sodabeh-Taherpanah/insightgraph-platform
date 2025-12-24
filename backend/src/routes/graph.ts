import express from 'express';
import multer from 'multer';
import { graph } from '../services/graphService';
import { extractTripletsFromText } from '../services/aiService';
import { indexDocument } from '../services/searchService';

export const router = express.Router();
const uploadMw = multer();

// Route: GET /graph → return graph data
router.get('/', async (req, res) => {
  try {
    // Assume the package has nodes and edges properties
    const nodes = (graph as any).nodes || [];
    const edges = (graph as any).edges || [];
    res.json({ nodes, edges });
  } catch (e) {
    // Fallback if properties don't exist
    res.json({ nodes: [], edges: [] });
  }
});
