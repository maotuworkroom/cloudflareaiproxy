// main.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { cors } from "https://deno.land/x/cors/mod.ts";

// 配置
const CF_ACCOUNT_ID = Deno.env.get("CF_ACCOUNT_ID") || "";
const CF_API_TOKEN = Deno.env.get("CF_API_TOKEN") || "";
const PORT = parseInt(Deno.env.get("PORT") || "8000");

// OpenAI 到 Cloudflare 模型映射
const MODEL_MAPPING: Record<string, string> = {
  "gpt-3.5-turbo": "@cf/meta/llama-2-7b-chat",
  "gpt-4": "@cf/meta/llama-3.1-8b-instruct",
};

interface OpenAIMessage {
  role: string;
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface CloudflareRequest {
  prompt: string;
  temperature?: number;
  max_tokens?: number;
}

// 将 OpenAI 格式转换为 Cloudflare 格式
function convertOpenAIToCF(body: OpenAIRequest): CloudflareRequest {
  const messages = body.messages;
  const prompt = messages
    .map((msg) => {
      if (msg.role === "system") {
        return `Instructions: ${msg.content}\n`;
      }
      if (msg.role === "assistant") {
        return `Assistant: ${msg.content}\n`;
      }
      return `Human: ${msg.content}\n`;
    })
    .join("");

  return {
    prompt,
    temperature: body.temperature,
    max_tokens: body.max_tokens,
  };
}

// 构建 Cloudflare API 响应为 OpenAI 格式
function buildOpenAIResponse(cfResponse: any) {
  return {
    id: crypto.randomUUID(),
    object: "chat.completion",
    created: Date.now(),
    model: "cloudflare-proxy",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: cfResponse.result.response,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: -1,
      completion_tokens: -1,
      total_tokens: -1,
    },
  };
}

// 处理请求的主函数
async function handleRequest(req: Request): Promise<Response> {
  // 处理 OPTIONS 请求
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body: OpenAIRequest = await req.json();
    const cfModel = MODEL_MAPPING[body.model] || "@cf/meta/llama-2-7b-chat";
    const cfBody = convertOpenAIToCF(body);

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${cfModel}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cfBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${error}`);
    }

    const cfResponse = await response.json();
    const openAIResponse = buildOpenAIResponse(cfResponse);

    return new Response(JSON.stringify(openAIResponse), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

// 启动服务器
console.log(`HTTP webserver running at: http://localhost:${PORT}`);
await serve(handleRequest, { port: PORT });