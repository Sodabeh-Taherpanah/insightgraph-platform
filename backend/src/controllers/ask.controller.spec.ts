import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import axios from 'axios';
import { Readable } from 'stream';
import { AskController } from './ask.controller';
import { AskService } from '../services/askService';
import { AppExceptionFilter } from '../common/filters/app-exception.filter';
import * as searchService from '../services/searchService';

// Elasticsearch/Redis layer and the FastAPI LLM service are mocked at their boundaries.
jest.mock('../services/searchService');
jest.mock('axios');

const mockedSearch = searchService as jest.Mocked<typeof searchService>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

const hits = [
  {
    id: 'Docker Guide#chunk_0',
    score: 9.12,
    source: {
      title: 'Docker Guide (Part 1/1)',
      text: 'Docker is a platform for containers.',
      createdAt: new Date().toISOString(),
    },
    highlights: [],
  },
];

describe('Ask endpoints', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AskController],
      providers: [AskService],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AppExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockedSearch.searchDocuments.mockResolvedValue(hits as never);
    mockedSearch.retrieveContext.mockResolvedValue('Docker is a platform.');
  });

  describe('POST /ask', () => {
    it('returns the LLM answer with sources', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { answer: 'Docker is a container platform.' },
      });

      const res = await request(app.getHttpServer())
        .post('/ask')
        .send({ question: 'What is Docker?' })
        .expect(201);

      expect(res.body).toEqual({
        answer: 'Docker is a container platform.',
        sources: [
          {
            id: 'Docker Guide#chunk_0',
            title: 'Docker Guide (Part 1/1)',
            score: 9.12,
          },
        ],
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringMatching(/\/llm\/ask$/),
        expect.objectContaining({
          question: 'What is Docker?',
          context: 'Docker is a platform.',
        }),
        expect.anything(),
      );
    });

    it('returns a fixed message and no sources when nothing matches', async () => {
      mockedSearch.searchDocuments.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .post('/ask')
        .send({ question: 'Unknown topic' })
        .expect(201);

      expect(res.body.sources).toEqual([]);
      expect(res.body.answer).toMatch(/No relevant documents/);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('rejects an empty question', async () => {
      const res = await request(app.getHttpServer())
        .post('/ask')
        .send({ question: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /ask/stream (SSE)', () => {
    it('streams answer tokens, then sources, then [DONE]', async () => {
      // FastAPI emits raw tokens as `data: <token>` events.
      mockedAxios.post.mockResolvedValue({
        data: Readable.from(['data: Docker\n\n', 'data:  is\n\n', 'data: [DONE]\n\n']),
      });

      const res = await request(app.getHttpServer())
        .post('/ask/stream')
        .send({ question: 'What is Docker?' })
        .buffer(true)
        .parse((r, cb) => {
          let data = '';
          r.setEncoding('utf8');
          r.on('data', (c) => (data += c));
          r.on('end', () => cb(null, data));
        });

      expect(res.headers['content-type']).toMatch(/text\/event-stream/);

      const body = res.body as string;
      const events = body.split('\n\n').filter(Boolean);
      expect(events.every((e) => e.startsWith('data: '))).toBe(true);
      expect(body.endsWith('\n\n')).toBe(true);

      const payloads = events.map((e) => e.slice('data: '.length));
      expect(payloads[payloads.length - 1]).toBe('[DONE]');

      const parsed = payloads.slice(0, -1).map((p) => JSON.parse(p));
      expect(parsed.filter((p) => p.type === 'answer').map((p) => p.content)).toEqual([
        'Docker',
        ' is',
      ]);
      const sources = parsed[parsed.length - 1];
      expect(sources.type).toBe('sources');
      expect(sources.sources[0].id).toBe('Docker Guide#chunk_0');
    });

    it('emits an error event for an invalid question', async () => {
      const res = await request(app.getHttpServer())
        .post('/ask/stream')
        .send({ question: '' });
      expect(res.text).toMatch(/^data: {"type":"error"/);
    });
  });
});
