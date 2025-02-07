// main.ts
import { serve } from "https://deno.land/std/http/server.ts";

// 配置
const CF_ACCOUNT_ID = Deno.env.get("CF_ACCOUNT_ID") || "";
const CF_API_TOKEN = Deno.env.get("CF_API_TOKEN") || "";
const PORT = parseInt(Deno.env.get("PORT") || "8000");

interface OpenAIMessage {
  role: string;
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface CloudflareRequest {
  prompt: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
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
    stream: body.stream
  };
}

// 构建 OpenAI 格式的响应
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

// 处理 AI 请求
async function handleAIRequest(req: Request): Promise<Response> {
  try {
    const body: OpenAIRequest = await req.json();
    const cfBody = convertOpenAIToCF(body);

    // 构建正确的模型路径
    const cloudflareEndpoint = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/deepseek-ai/deepseek-math-7b-instruct`;
    
    console.log("Sending request to:", cloudflareEndpoint);
    
    const response = await fetch(cloudflareEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cfBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare API Response:", errorText);
      throw new Error(`Cloudflare API error: ${errorText}`);
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
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "An error occurred while processing your request." 
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
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

  // 只处理 POST 请求
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  return handleAIRequest(req);
}

// 启动服务器
console.log(`HTTP webserver running at: http://localhost:${PORT}`);
await serve(handleRequest, { port: PORT });