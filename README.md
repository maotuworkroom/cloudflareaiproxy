
# Cloudflare AI Proxy

Cloudflare AI Proxy 是一个基于 TypeScript 的代理服务，它将 OpenAI 格式的请求转换为 Cloudflare API 格式，并返回相应的响应。

## 安装教程

1. **克隆此存储库到本地：**
   ```sh
   git clone https://github.com/maotuworkroom/cloudflareaiproxy.git
   cd cloudflareaiproxy
   ```

2. **安装 Deno：**
   请参考 [Deno 官方安装指南](https://deno.land/manual@v1.28.3/getting_started/installation) 安装 Deno。

3. **配置环境变量：**
   在运行该项目之前，请确保设置以下环境变量：

   - `CF_ACCOUNT_ID`：你的 Cloudflare 账户 ID
   - `CF_API_TOKEN`：你的 Cloudflare API 令牌
   - `PORT`：服务器监听的端口，默认为 8000

   你可以在项目根目录下创建一个 `.env` 文件来设置这些变量：

   ```env
   CF_ACCOUNT_ID=your_cloudflare_account_id
   CF_API_TOKEN=your_cloudflare_api_token
   PORT=8000
   ```

## 使用教程

1. **启动服务器：**
   ```sh
   deno run --allow-env --allow-net main.ts
   ```

2. **服务器启动后，你可以通过 `http://localhost:8000` 访问 API 服务。

## 示例请求

向服务器发送 POST 请求以处理 AI 请求。示例请求体如下：

```json
{
  "model": "text-davinci-003",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Tell me a joke."}
  ],
  "temperature": 0.7,
  "max_tokens": 50
}
```

## 跨域问题

目前已经设置为通用，不限制

## 许可证

此项目使用 MIT 许可证。详细信息请参阅 [LICENSE](LICENSE) 文件。

希望这个示例文档对你有帮助！如果有任何其他需求，请告诉我。
