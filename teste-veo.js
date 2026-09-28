require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');
const path = require('path');

async function main() {
  console.log('========================================');
  console.log(' TESTE REAL — GOOGLE VEO 3.1');
  console.log('========================================');

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.startsWith('COLE_AQUI')) {
    throw new Error('GEMINI_API_KEY não está configurada.');
  }

  console.log('Chave Gemini: CONFIGURADA');
  console.log('Modelo:', process.env.GEMINI_VIDEO_MODEL);

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Uma animação infantil bíblica em estilo 3D cinematográfico,
colorida, acolhedora e apropriada para crianças de 3 a 10 anos.
Uma pequena ovelha branca caminha alegremente por uma paisagem
verde próxima a uma aldeia bíblica ao amanhecer.
A câmera acompanha suavemente a ovelha enquanto ela olha para
o céu iluminado pelo sol. Atmosfera de paz, esperança e cuidado.
Movimentos suaves, expressão amigável, aparência de animação
infantil de alta qualidade. Sem texto na tela.
`;

  console.log('');
  console.log('Enviando geração para o Veo 3.1...');
  console.log('Isso pode levar alguns minutos.');
  console.log('');

  let operation = await ai.models.generateVideos({
    model: process.env.GEMINI_VIDEO_MODEL || 'veo-3.1-generate-preview',
    prompt,
    config: {
      aspectRatio: '16:9',
      resolution: '720p',
      numberOfVideos: 1
    }
  });

  console.log('Operação criada:', operation.name || '(sem nome)');
  console.log('Status inicial:', operation.done ? 'CONCLUÍDA' : 'PROCESSANDO');

  while (!operation.done) {
    console.log('Aguardando Veo...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    operation = await ai.operations.getVideosOperation({
      operation
    });
  }

  console.log('');
  console.log('Operação concluída.');

  if (operation.error) {
    throw new Error(JSON.stringify(operation.error, null, 2));
  }

  const generatedVideos = operation.response?.generatedVideos || [];

  if (!generatedVideos.length || !generatedVideos[0]?.video) {
    throw new Error(
      'O Veo concluiu, mas não retornou um vídeo.'
    );
  }

  const outputPath = path.resolve('./veo-teste-01.mp4');

  console.log('Baixando vídeo...');
  
  await ai.files.download({
    file: generatedVideos[0].video,
    downloadPath: outputPath
  });

  console.log('');
  console.log('========================================');
  console.log(' TESTE CONCLUÍDO COM SUCESSO');
  console.log('========================================');
  console.log('Arquivo:', outputPath);
}

main().catch(error => {
  console.error('');
  console.error('========================================');
  console.error(' TESTE DO VEO FALHOU');
  console.error('========================================');
  console.error(error.message || error);
  process.exit(1);
});
