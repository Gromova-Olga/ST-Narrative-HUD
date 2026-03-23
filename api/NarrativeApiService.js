// api/NarrativeApiService.js
import { proxies, chat_completion_sources } from '../../../../openai.js';
import { getEventSourceStream } from '../../../../sse-stream.js';

const { getRequestHeaders, extensionSettings } = SillyTavern.getContext();

export const NarrativeApiService = {
    /**
     * Получает профиль подключения по имени
     */
    getConnectionProfile(profileName) {
        const profiles = extensionSettings.connectionManager?.profiles || [];
        if (profileName) {
            const found = profiles.find(p => p.name === profileName);
            if (found) return found;
        }
        return null;
    },

    /**
     * Правильно маппит API в chat_completion_source
     */
    getChatCompletionSource(apiName) {
    if (apiName === 'google') return chat_completion_sources.MAKERSUITE;
    if (apiName === 'claude') return chat_completion_sources.CLAUDE;
    if (apiName === 'openrouter') return chat_completion_sources.OPENROUTER;
    return apiName; // для 'custom', 'openai' и всех остальных возвращаем строку как есть
},
    /**
     * Основной метод генерации
     */
    async generate(messages, profileName, systemPrompt, options = {}) {
        const {
            temperature = 0.7,
            max_tokens = 3000,
            stream = false,
        } = options;

        // 1. Получаем профиль
        const profile = this.getConnectionProfile(profileName);
        if (!profile) throw new Error('Профиль подключения не найден');

        // 2. Определяем правильный chat_completion_source
        let cc_source = this.getChatCompletionSource(profile.api);

        // 3. Формируем messages с system prompt внутри сообщения пользователя (Защита от ошибок API)
        const finalMessages = [...messages];
        if (systemPrompt) {
            if (finalMessages.length > 0 && finalMessages[0].role === 'user') {
                finalMessages[0].content = `[SYSTEM INSTRUCTION]\n${systemPrompt}\n\n${finalMessages[0].content}`;
            } else {
                finalMessages.unshift({ role: 'user', content: `[SYSTEM INSTRUCTION]\n${systemPrompt}` });
            }
        }

        // 4. Базовые данные для генерации
        const generateData = {
            messages: finalMessages,
            temperature: temperature,
            max_tokens: max_tokens,
            stream: stream,
            chat_completion_source: cc_source,
            use_sysprompt: false, // Отключаем, так как вшили сами
        };

        // Защита от пустых имен моделей
        if (profile.model && profile.model.trim() !== '') {
            generateData.model = profile.model;
        }
        if (profile.model_custom && profile.model_custom.trim() !== '') {
            generateData.model_custom = profile.model_custom;
        }

        // 5. Добавляем прокси если нужно
        const proxy_preset = proxies.find(p => p.name === profile.proxy);
        if (proxy_preset && proxy_preset.url) {
            generateData.reverse_proxy = proxy_preset.url;
            generateData.proxy_password = proxy_preset.password;
        }
        // Для Custom (OpenAI-compatible) — берём api-url из профиля
        if (profile.api === 'custom' && profile['api-url']) {
            generateData.custom_url = profile['api-url'];
            generateData.reverse_proxy = profile['api-url'];
        }

        // 6. Отправляем запрос
        const response = await fetch('/api/backends/chat-completions/generate', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify(generateData)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText.substring(0, 300)}`);
        }

        // 7. Обрабатываем ответ
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || 'API error');

        // 8. Извлекаем текст
        return this.extractMessageContent(data, cc_source);
    },

    /**
     * Извлекает текст из ответа API
     */
    extractMessageContent(data, cc_source) {
        if (cc_source === chat_completion_sources.CLAUDE) {
            return data.content?.[0]?.text?.trim() || '';
        } else if (cc_source === chat_completion_sources.MAKERSUITE) {
            return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        } else {
            return data.choices?.[0]?.message?.content?.trim() || '';
        }
    },

    /**
     * Версия со streaming (если понадобится)
     */
    async generateStream(messages, profileName, systemPrompt, options = {}, onChunk) {
        // Аналогично, но с обработкой стрима
        // ...
    }
};
