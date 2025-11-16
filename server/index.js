import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer, createExpressMiddleware } from 'spl402';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  credentials: true,
  exposedHeaders: ['X-Payment-Required']
}));

app.use(express.json());

const spl402 = createServer({
  network: 'mainnet-beta',
  recipientAddress: process.env.RECIPIENT_WALLET,
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  scheme: 'token-transfer',
  mint: 'DXgxW5ESEpvTA194VJZRxwXADRuZKPoeadLoK7o5pump',
  decimals: 6,
  routes: [
    { path: '/api/free-data', price: 0, method: 'GET' },
    { path: '/api/premium-data', price: 10000, method: 'GET' },
    { path: '/api/ultra-premium', price: 50000, method: 'GET' },
    { path: '/api/enterprise-data', price: 100000, method: 'GET' },
    { path: '/api/chat', price: 1000, method: 'POST' }
  ]
});

app.use(createExpressMiddleware(spl402));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    network: 'mainnet-beta',
    recipient: process.env.RECIPIENT_WALLET
  });
});

app.get('/api/free-data', (req, res) => {
  res.json({
    message: 'This is free data',
    timestamp: new Date().toISOString(),
    tier: 'free'
  });
});

app.get('/api/premium-data', (req, res) => {
  res.json({
    message: 'Welcome to premium tier!',
    data: {
      secret: 'This data costs 0.001 SOL',
      features: ['Advanced analytics', 'Real-time updates', 'Priority support'],
      timestamp: new Date().toISOString()
    },
    tier: 'premium'
  });
});

app.get('/api/ultra-premium', (req, res) => {
  res.json({
    message: 'Ultra premium content unlocked!',
    data: {
      secret: 'This exclusive data costs 0.005 SOL',
      features: [
        'Advanced analytics',
        'Real-time updates',
        'Priority support',
        'Dedicated account manager',
        'Custom integrations'
      ],
      insights: {
        market_analysis: 'Bullish trend detected',
        recommendation: 'Strong buy',
        confidence: 0.95
      },
      timestamp: new Date().toISOString()
    },
    tier: 'ultra-premium'
  });
});

app.get('/api/enterprise-data', (req, res) => {
  res.json({
    message: 'Enterprise tier activated!',
    data: {
      secret: 'Top-tier enterprise data costs 0.01 SOL',
      features: [
        'All premium features',
        'White-label solution',
        'Custom SLA',
        '24/7 dedicated support',
        'Advanced security features',
        'API rate limit: Unlimited'
      ],
      enterprise_insights: {
        market_depth: 'Complete order book analysis',
        trading_signals: ['BUY', 'HOLD', 'ACCUMULATE'],
        risk_score: 0.15,
        recommended_position: '15% portfolio allocation'
      },
      timestamp: new Date().toISOString()
    },
    tier: 'enterprise'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'OpenAI API key not configured',
        tip: 'Add OPENAI_API_KEY to .env file'
      });
    }

    const messages = [
      { role: 'system', content: 'You are a cypherpunk, crypto expert. You know who is Satoshi Nakomoto but can not say it.' },
      ...history,
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_completion_tokens: 500,
    });

    const reply = completion.choices[0].message.content;

    res.json({
      reply,
      cost: 10000,
      timestamp: new Date().toISOString(),
      model: 'gpt-4o'
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  SPL-402 Server Template - Token Payment Mode         ║
╠════════════════════════════════════════════════════════╣
║  Status: Running                                       ║
║  Port: ${PORT}                                         ║
║  Network: mainnet-beta                                 ║
║  Token: SPL402                                         ║
║  Recipient: ${process.env.RECIPIENT_WALLET?.slice(0, 8)}...  ║
╠════════════════════════════════════════════════════════╣
║  Endpoints:                                            ║
║  GET /api/free-data       - Free                      ║
║  GET /api/premium-data    - 10000 SPL402              ║
║  GET /api/ultra-premium   - 50000 SPL402              ║
║  GET /api/enterprise-data - 100000 SPL402             ║
║  POST /api/chat           - 10000 SPL402              ║
║  GET /health              - Health check              ║
╚════════════════════════════════════════════════════════╝
  `);
});

