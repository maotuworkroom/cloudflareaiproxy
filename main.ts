// main.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4/accounts";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const AUTH_TOKEN = Deno.env.get("DENO_AUTH_TOKEN");
const ACCOUNT_ID = Deno.env.get("DENO_ACCOUNT_ID");

async function handleRequest(request: Request) {
  // 处理预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // 验证必要环境变量
  if (!AUTH_TOKEN || !ACCOUNT_ID) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // 解析客户端请求
    const { model, prompt, max_tokens, stream } = await request.json();

    // 构建Cloudflare API请求
    const cfUrl = `${CLOUDFLARE_API_BASE}/${ACCOUNT_ID}/ai/run/${model}`;
    const cfResponse = await fetch(cfUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        max_tokens,
        stream,
      }),
    });

    // 处理响应
    if (!cfResponse.ok) {
      const error = await cfResponse.text();
      return new Response(JSON.stringify({ error }), {
        status: cfResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await cfResponse.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        },
      }
    );
  }
}

console.log("Server running at http://localhost:8000");
serve(handleRequest, { port: 8000 });
