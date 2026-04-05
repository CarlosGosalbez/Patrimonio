# MCP Servers — Patrimio

Este directorio contiene servidores MCP (Model Context Protocol) para extender las capacidades de los agentes IA de Patrimio.

## ¿Qué es un MCP Server?

Un MCP server expone herramientas (tools) que los agentes de Claude pueden invocar para:

- Conectar con APIs externas (market data, bancos, fiscal)
- Procesar datos especializados (CSVs bancarios, PDFs)
- Ejecutar operaciones batch (categorización masiva)
- Componer operaciones complejas en tools de alto nivel

## Estructura de un MCP

```
mcp-servers/
├── market-data/         # Precios de mercado con multi-source fallback
│   ├── index.ts         # Entry point del servidor
│   ├── package.json     # Deps: @modelcontextprotocol/sdk
│   └── tools/
│       ├── get-quote.ts
│       └── get-historical.ts
├── bank-parser/         # Parser de extractos bancarios españoles
│   ├── index.ts
│   └── formats/
│       ├── santander.ts
│       ├── bbva.ts
│       └── caixabank.ts
└── reports/             # Generación de informes PDF/Excel
    ├── index.ts
    └── templates/
```

## Cómo Crear un MCP

### 1. Inicializar el proyecto

```bash
cd mcp-servers
mkdir my-mcp && cd my-mcp
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D @types/node typescript
npx tsc --init
```

### 2. Crear `index.ts`

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new Server(
  {
    name: "patrimio-my-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Listar tools disponibles
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "my_tool",
      description: "Descripción clara de qué hace",
      inputSchema: {
        type: "object",
        properties: {
          param: { type: "string", description: "Descripción del parámetro" },
        },
        required: ["param"],
      },
    },
  ],
}));

// Ejecutar tools
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "my_tool") {
    // Validar con Zod
    const schema = z.object({ param: z.string() });
    const validated = schema.parse(args);

    // Ejecutar lógica
    const result = await doSomething(validated.param);

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Iniciar servidor
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3. Configurar en `.claude/settings.json`

```json
{
  "mcpServers": {
    "patrimio-my-mcp": {
      "command": "node",
      "args": ["--loader", "ts-node/esm", "mcp-servers/my-mcp/index.ts"]
    }
  }
}
```

### 4. Usar desde agentes

Los agentes invocan el tool automáticamente cuando lo necesiten:

```typescript
// En app/api/ai/insights/route.ts
const result = await streamText({
  model: anthropic("claude-sonnet-4-5"),
  tools: {
    // Los MCP tools se registran automáticamente
  },
});
```

## MCPs Planificados para Patrimio

| MCP           | Estado       | Módulo | Descripción                                        |
| ------------- | ------------ | ------ | -------------------------------------------------- |
| `market-data` | 📝 Pendiente | M5     | APIs de cotizaciones (Yahoo → Alpha Vantage → FMP) |
| `bank-parser` | 📝 Pendiente | M3     | Parser de CSVs de bancos españoles                 |
| `reports`     | 📝 Pendiente | M7     | Generación de PDF/Excel con charts                 |
| `categorizer` | 📝 Pendiente | M2     | Batch categorization con reglas + Claude           |

## Reglas de Seguridad

1. **Nunca exponer `service_role` key** — usar RLS y user-scoped auth
2. **Validar todos los inputs** con Zod antes de procesar
3. **Rate limiting** — usar `@upstash/ratelimit` para APIs externas
4. **Logging** — logs estructurados en `logs/mcp-[name].log`
5. **Error handling** — devolver errores estructurados, nunca throw sin catch

## Testing

```typescript
// mcp-servers/my-mcp/test.ts
import { describe, it, expect } from "vitest";

describe("my_tool", () => {
  it("should process input correctly", async () => {
    const result = await callTool("my_tool", { param: "test" });
    expect(result).toBeDefined();
  });
});
```

## Deployment

Los MCP servers se ejecutan localmente en desarrollo. Para producción:

- Convertir a Edge Function de Supabase si necesita DB access
- Convertir a Vercel Serverless Function si es stateless
- Mantener como MCP local si es herramienta de desarrollo

## Referencias

- [MCP Specification](https://modelcontextprotocol.io/docs)
- [MCP SDK TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [Ejemplos de MCP](https://github.com/modelcontextprotocol/servers)
