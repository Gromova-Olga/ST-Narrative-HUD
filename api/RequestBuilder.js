// api/RequestBuilder.js

/**
 * Построение запросов к API
 * 
 * Формирует данные для POST /api/backends/chat-completions/generate
 */

import { getChatCompletionSource, getProxySettings, getCustomUrl } from './ProfileResolver.js';

/**
 * Собирает сообщения для отправки
 * Инжектит system prompt в первое user-сообщение (защита от ошибок API)
 * @param {Array} messages - [{ role, content }]
 * @param {string} systemPrompt
 * @returns {Array}
 */
export function buildMessages(messages, systemPrompt) {
    const finalMessages = [...messages];

    if (systemPrompt) {
        const prefixed = `[SYSTEM INSTRUCTION]\n${systemPrompt}\n`;
        if (finalMessages.length > 0 && finalMessages[0].role === 'user') {
            finalMessages[0].content = prefixed + '\n' + finalMessages[0].content;
        } else {
            finalMessages.unshift({ role: 'user', content: prefixed });
        }
    }

    return finalMessages;
}

/**
 * Собирает контекстные сообщения из DOM чата
 * @param {number} count - количество сообщений
 * @param {boolean} onlyUserAssistant - только user/assistant
 * @returns {Array}
 */
export function buildContextFromDOM(count = 10) {
    const messages = [];
    const mesElements = document.querySelectorAll('.mes');
    const sliced = Array.from(mesElements).slice(-Math.min(count, 20));

    sliced.forEach(mes => {
        const isUser = mes.getAttribute('is_user') === 'true';
        const textEl = mes.querySelector('.mes_text');
        if (!textEl) return;

        const clone = textEl.cloneNode(true);
        // Удаляем details/summary блоки (внутренние данные)
        clone.querySelectorAll('details').forEach(el => el.remove());
        const text = clone.textContent.trim();
        if (text) {
            messages.push({ role: isUser ? 'user' : 'assistant', content: text });
        }
    });

    return messages;
}

/**
 * Собирает полный объект данных для generate-запроса
 * @param {Object} profile - профиль подключения
 * @param {Array} messages - сообщения
 * @param {Object} options - { temperature, max_tokens, stream }
 * @returns {Object}
 */
export function buildGenerateData(profile, messages, options = {}) {
    const {
        temperature = 0.7,
        max_tokens = 3000,
        stream = false,
    } = options;

    const cc_source = getChatCompletionSource(profile.api);

    const data = {
        messages,
        temperature,
        max_tokens,
        stream,
        chat_completion_source: cc_source,
        use_sysprompt: false,
    };

    // Модель
    if (profile.model && profile.model.trim() !== '') {
        data.model = profile.model;
    }
    if (profile.model_custom && profile.model_custom.trim() !== '') {
        data.model_custom = profile.model_custom;
    }

    // Прокси
    const proxy = getProxySettings(profile);
    if (proxy) {
        data.reverse_proxy = proxy.url;
        data.proxy_password = proxy.password;
    }

    // Custom URL
    const customUrl = getCustomUrl(profile);
    if (customUrl) {
        data.custom_url = customUrl;
        data.reverse_proxy = customUrl;
    }

    return data;
}
