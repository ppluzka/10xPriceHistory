# OpenRouter Service - Setup Guide

## 🚀 Quick Setup

### 1. Environment Configuration

Create a `.env` file in the project root with your OpenRouter API key:

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Optional (defaults shown)
# OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
# OPENROUTER_DEFAULT_MODEL=gpt-4o-mini
# OPENROUTER_TIMEOUT_MS=60000
# OPENROUTER_MAX_RETRIES=3
```

### 2. Get your API Key

1. Go to https://openrouter.ai
2. Sign up or log in
3. Navigate to https://openrouter.ai/keys
4. Create a new API key
5. Copy the key (starts with `sk-or-v1-`)

### 3. Test the Installation

Start the dev server:

```bash
npm run dev
```

Test the health endpoint:

```bash
curl http://localhost:4321/api/llm
```

Expected response:

```json
{
  "status": "healthy",
  "service": "openrouter",
  "timestamp": "2025-11-02T..."
}
```

### 4. Test a Chat Completion

```bash
curl -X POST http://localhost:4321/api/llm \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

## 📚 Documentation

Full documentation is available in `.ai/` directory:

- `openrouter-README.md` - Main documentation
- `openrouter-usage-examples.md` - Usage examples
- `openrouter-observability.md` - Monitoring guide
- `openrouter-service-implementation-plan.md` - Implementation details

## 🔧 Implementation Files

### Backend

- `src/lib/openrouter.service.ts` - Core service
- `src/lib/rate-limiter.service.ts` - Rate limiting
- `src/pages/api/llm.ts` - API endpoint

### Frontend

- `src/lib/openrouter.client.ts` - Client helper

### Types

- `src/types.ts` - TypeScript definitions

## ✅ Verification Checklist

- [ ] Dependencies installed (ajv, p-retry, p-limit)
- [ ] `.env` file created with OPENROUTER_API_KEY
- [ ] Dev server running
- [ ] Health check returns "healthy"
- [ ] Test chat completion works

## 🆘 Troubleshooting

**"OPENROUTER_API_KEY environment variable is not set"**
→ Make sure `.env` file exists in project root with the correct key

**"Authentication failed: 401"**
→ Check if your API key is valid and not expired

**Health check returns unhealthy**
→ Check your internet connection and OpenRouter status at https://status.openrouter.ai

## 📖 Next Steps

1. Read usage examples in `.ai/openrouter-usage-examples.md`
2. Implement AI features in your app
3. Set up monitoring (see `.ai/openrouter-observability.md`)
4. Configure rate limits for production

## 💰 Cost Management

Monitor your token usage:

- OpenRouter dashboard: https://openrouter.ai/activity
- Default model (gpt-4o-mini) is cost-effective
- Set up billing alerts in OpenRouter dashboard

---

For more information, see `.ai/openrouter-README.md`
