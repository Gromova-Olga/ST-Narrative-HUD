// ui/rendering/DomBuilder.js

/**
 * Построение DOM-элементов
 * Утилиты для создания HTML-элементов из JS
 */

/**
 * Создаёт элемент с атрибутами и содержимым
 */
export function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, val]) => {
        if (key === 'className') el.className = val;
        else if (key === 'innerHTML') el.innerHTML = val;
        else if (key === 'textContent') el.textContent = val;
        else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
        else if (key === 'style' && typeof val === 'object') Object.assign(el.style, val);
        else el.setAttribute(key, val);
    });
    children.forEach(child => {
        if (typeof child === 'string') el.appendChild(document.createTextNode(child));
        else if (child instanceof Node) el.appendChild(child);
    });
    return el;
}

/**
 * Создаёт jQuery-элемент из HTML-строки
 */
export function $(html) {
    return window.jQuery(html);
}

/**
 * Безопасно заменяет содержимое элемента
 */
export function setContent(selector, html) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (el) el.innerHTML = html;
}

/**
 * Добавляет класс с анимацией
 */
export function addClassAnimated(el, className, duration = 300) {
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), duration);
}

/**
 * Показывает элемент с fade-in
 */
export function fadeIn(el, duration = 200) {
    if (el instanceof window.jQuery) {
        el.fadeIn(duration);
    } else {
        el.style.display = '';
        el.style.opacity = '0';
        requestAnimationFrame(() => {
            el.style.transition = `opacity ${duration}ms`;
            el.style.opacity = '1';
        });
    }
}

/**
 * Скрывает элемент с fade-out
 */
export function fadeOut(el, duration = 200) {
    if (el instanceof window.jQuery) {
        el.fadeOut(duration);
    } else {
        el.style.transition = `opacity ${duration}ms`;
        el.style.opacity = '0';
        setTimeout(() => { el.style.display = 'none'; }, duration);
    }
}
