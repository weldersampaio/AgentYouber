require("dotenv").config();

const OpenAI = require("openai");

const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
});

async function main() {
  console.log("========================================");
  console.log(" TESTE NVIDIA NEMOTRON 3 ULTRA");
  console.log("========================================");
  console.log("Conectando à NVIDIA...\n");

  const completion = await client.chat.completions.create({
    model: "nvidia/nemotron-3-ultra-550b-a55b",

    messages: [
      {
        role: "user",
        content:
          "Responda em português. Você é o cérebro de um agente de automação do YouTube chamado YouTube Automation Agent. Explique em poucas palavras qual seria sua função nesse sistema.",
      },
    ],

    temperature: 1,
    top_p: 0.95,
    max_tokens: 500,
    stream: true,
  });

  for await (const chunk of completion) {
    if (!chunk.choices || !chunk.choices.length) continue;

    const delta = chunk.choices[0].delta;

    if (delta.content) {
      process.stdout.write(delta.content);
    }
  }

  console.log("\n\n========================================");
  console.log(" TESTE CONCLUÍDO");
  console.log("========================================");
}

main().catch((error) => {
  console.error("\n========================================");
  console.error(" ERRO NO NEMOTRON");
  console.error("========================================");
  console.error("Mensagem:", error.message);
  console.error("HTTP:", error.status || "não informado");

  if (error.response) {
    console.error("Resposta:", error.response);
  }
});