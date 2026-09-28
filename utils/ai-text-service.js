const OpenAI = require('openai');
const { Logger } = require('./logger');

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-pro-preview',
  'gemini-3.7-flash',
];

const GEMINI_DEFAULT_MODEL = GEMINI_MODELS[0];

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.6',
    models: ['gpt-5.6', 'gpt-5.6-terra', 'gpt-5.6-luna'],
    envKey: 'OPENAI_API_KEY',
  },

  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-5.6-sol',
    models: [
      'openai/gpt-5.6-sol',
      'anthropic/claude-fable-5',
      'google/gemini-3.7-flash',
      'moonshotai/kimi-k3',
      'z-ai/glm-5.3',
    ],
    envKey: 'OPENROUTER_API_KEY',
  },

  kimi: {
    name: 'Kimi (Moonshot AI)',
    baseURL: 'https://api.moonshot.ai/v1',
    defaultModel: 'kimi-k3',
    models: ['kimi-k3', 'kimi-k2.7-code', 'kimi-k2.6'],
    envKey: 'MOONSHOT_API_KEY',
  },

  mimo: {
    name: 'MiMo (Xiaomi)',
    baseURL: 'https://api.xiaomimimo.com/v1',
    defaultModel: 'mimo-v2.5-pro',
    models: ['mimo-v2.5-pro', 'mimo-v2.5'],
    envKey: 'MIMO_API_KEY',
  },

  glm: {
    name: 'GLM (Zhipu AI)',
    baseURL: 'https://api.z.ai/api/paas/v4/',
    defaultModel: 'glm-5.3',
    models: ['glm-5.3', 'glm-5.2', 'glm-5.1'],
    envKey: 'GLM_API_KEY',
  },

  // NVIDIA Nemotron - cérebro/orquestrador do YouTube Automation Agent
  nvidia: {
    name: 'NVIDIA Nemotron',
    baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    defaultModel:
      process.env.NVIDIA_TEXT_MODEL ||
      'nvidia/nemotron-3-ultra-550b-a55b',
    models: [
      'nvidia/nemotron-3-ultra-550b-a55b',
    ],
    envKey: 'NVIDIA_API_KEY',
  },
};

class AITextService {
  constructor(credentials = {}) {
    this.logger = new Logger('AITextService');

    this.client = null;
    this.gemini = null;
    this.model = null;
    this.providerName = null;
    this.providerId = null;

    this._init(credentials);
  }

  _init(credentials) {
    const provider = credentials.aiProvider?.provider;
    const apiKey = credentials.aiProvider?.apiKey;
    const model = credentials.aiProvider?.model;

    // 1. Provider explicitamente informado pelas credenciais
    if (provider && PROVIDERS[provider] && apiKey) {
      return this._initOpenAICompatible(
        PROVIDERS[provider],
        apiKey,
        model
      );
    }

    // 2. Permite selecionar o provider pelo .env
    const envProvider = process.env.AI_TEXT_PROVIDER;

    if (envProvider && PROVIDERS[envProvider]) {
      const preset = PROVIDERS[envProvider];
      const key = process.env[preset.envKey];

      if (key) {
        return this._initOpenAICompatible(
          preset,
          key,
          model || preset.defaultModel
        );
      }

      this.logger.warn(
        `AI_TEXT_PROVIDER=${envProvider}, but ${preset.envKey} is not configured`
      );
    }

    // 3. Comportamento anterior:
    // procura automaticamente o primeiro provider com API key
    for (const [providerId, preset] of Object.entries(PROVIDERS)) {
      const key = process.env[preset.envKey];

      if (key) {
        return this._initOpenAICompatible(
          preset,
          key,
          model
        );
      }
    }

    // 4. Gemini continua como fallback
    const geminiKey =
      credentials.gemini?.apiKey ||
      process.env.GEMINI_API_KEY;

    if (geminiKey) {
      return this._initGemini(
        geminiKey,
        credentials.gemini?.model
      );
    }

    this.logger.warn(
      'No AI text provider configured - text generation unavailable'
    );
  }

  _initOpenAICompatible(preset, apiKey, model) {
    this.client = new OpenAI({
      apiKey,
      baseURL: preset.baseURL,
    });

    this.model = model || preset.defaultModel;
    this.providerName = preset.name;

    const providerEntry = Object.entries(PROVIDERS).find(
      ([, value]) => value === preset
    );

    this.providerId = providerEntry
      ? providerEntry[0]
      : null;

    this.logger.info(
      `${preset.name} initialized (model: ${this.model})`
    );
  }

  _initGemini(apiKey, model) {
    try {
      const { GoogleGenAI } = require('@google/genai');

      this.gemini = new GoogleGenAI({
        apiKey,
      });

      this.model = model || GEMINI_DEFAULT_MODEL;
      this.providerName = 'Google Gemini';
      this.providerId = 'gemini';

      this.logger.info(
        `Gemini initialized (model: ${this.model})`
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize Gemini:',
        error.message
      );
    }
  }

  async generateText(prompt, options = {}) {
    const model = options.model || this.model;
    const maxTokens = options.maxTokens || 2048;
    const temperature =
      options.temperature ?? 0.7;

    // =========================================================
    // GEMINI
    // =========================================================

    if (this.gemini) {
      const config = {
        maxOutputTokens: maxTokens,
      };

      if (
        !/^gemini-3\.(?:[5-9]|\d{2,})-/.test(model)
      ) {
        config.temperature = temperature;
      }

      const response =
        await this.gemini.models.generateContent({
          model,
          contents: prompt,
          config,
        });

      const text =
        response && response.text;

      if (
        typeof text !== 'string' ||
        !text.trim()
      ) {
        throw new Error(
          `${this.providerName} returned an empty response. ` +
          `Check the API key and model quota.`
        );
      }

      return text;
    }

    // =========================================================
    // OPENAI-COMPATIBLE PROVIDERS
    // NVIDIA / Nemotron também entra aqui
    // =========================================================

    if (!this.client) {
      throw new Error(
        'No AI text provider configured'
      );
    }

    const params = {
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
    };

    try {
      // OpenAI moderno e providers compatíveis
      const response =
        await this.client.chat.completions.create({
          ...params,
          max_completion_tokens: maxTokens,
        });

      return this._extractContent(response);

    } catch (error) {

      // Alguns providers/modelos ainda utilizam
      // max_tokens em vez de max_completion_tokens.
      if (
        error &&
        error.status === 400 &&
        /max(_completion)?_tokens/i.test(
          error.message || ''
        )
      ) {
        const response =
          await this.client.chat.completions.create({
            ...params,
            max_tokens: maxTokens,
          });

        return this._extractContent(response);
      }

      throw error;
    }
  }

  _extractContent(response) {
    const content =
      response &&
      response.choices &&
      response.choices[0] &&
      response.choices[0].message
        ? response.choices[0].message.content
        : null;

    if (
      typeof content !== 'string' ||
      !content.trim()
    ) {
      throw new Error(
        `${this.providerName} returned an empty response. ` +
        `Check the API key and model quota.`
      );
    }

    return content;
  }

  isAvailable() {
    return !!(
      this.client ||
      this.gemini
    );
  }
}

module.exports = {
  AITextService,
  PROVIDERS,
  GEMINI_MODELS,
  GEMINI_DEFAULT_MODEL,
};