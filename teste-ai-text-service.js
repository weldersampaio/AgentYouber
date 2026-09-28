require("dotenv").config();

const { AITextService } = require("./utils/ai-text-service");

async function main() {
  console.log("========================================");
  console.log(" TESTE AI TEXT SERVICE");
  console.log("========================================");

  const ai = new AITextService();

  console.log("Provider:", ai.providerName);
  console.log("Modelo:", ai.model);
  console.log("Disponível:", ai.isAvailable());
  console.log("Provider ID:", ai.providerId);

  console.log("\nEnviando teste para o cérebro...\n");

  const resposta = await ai.generateText(
    "Responda em português do Brasil. Você é o cérebro central de um sistema chamado YouTube Automation Agent. Explique em poucas frases qual é sua função como planejador e orquestrador do sistema."
  );

  console.log("========================================");
  console.log(" RESPOSTA DO NEMOTRON");
  console.log("========================================");
  console.log(resposta);

  console.log("\n========================================");
  console.log(" TESTE CONCLUÍDO");
  console.log("========================================");
}

main().catch((error) => {
  console.error("\n========================================");
  console.error(" ERRO NO AI TEXT SERVICE");
  console.error("========================================");
  console.error("Mensagem:", error.message);
  console.error("HTTP:", error.status || "não informado");
});