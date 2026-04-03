// utils/dom/ElementFinder.js

/**
 * Поиск элементов в DOM с кешированием
 */

const _cache = new Map();
const CACHE_TTL = 5000; // 5 секунд

/**
 * Находит элемент по селектору с кешированием
 */
export function findCached(selector) {
    const now = Date.now();
    const cached = _cache.get(selector);
    if (cached && (now - cached.time) < CACHE_TTL && document.contains(cached.el)) {
        return cached.el;
    }
    const el = document.querySelector(selector);
    _cache.set(selector, { el, time: now });
    return el;
}

/**
 * Инвалидирует кеш для селектора
 */
export function invalidateCache(selector) {
    if (selector) _cache.delete(selector);
    else _cache.clear();
}

/**
 * Ждёт появления элемента в DOM (polling)
 * @param {string} selector
 * @param {number} timeout
 * @returns {Promise<Element|null>}
 */
export function waitForElement(selector, timeout = 5000) {
    return new Promise(resolve => {
        const existing = document.querySelector(selector);
        if (existing) return resolve(existing);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            resolve(document.querySelector(selector));
        }, timeout);
    });
}

/**
 * Ждёт исчезновения элемента
 * @param {string} selector
 * @param {number} timeout
 * @returns {Promise<boolean>}
 */
export function waitForRemoval(selector, timeout = 5000) {
    return new Promise(resolve => {
        const el = document.querySelector(selector);
        if (!el) return resolve(true);

        const observer = new MutationObserver(() => {
            if (!document.querySelector(selector)) {
                observer.disconnect();
                resolve(true);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            resolve(!document.querySelector(selector));
        }, timeout);
    });
}

/**
 * Находит ближайший родительский элемент по селектору
 */
export function findParent(element, selector) {
    return element?.closest(selector) || null;
}
