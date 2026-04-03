// constants/UiConstants.js

export const UI_CONSTANTS = {
    // CSS-селекторы
    selectors: {
        hudContainer: '#nhud-hud',
        settingsContainer: '#nhud-settings',
        modalContainer: '#nhud-modal',
        messageContainer: '.mes',
        chatContainer: '#chat',
        trackerBars: '.nhud-tracker-bar',
        characterCards: '.nhud-character-card',
        infoBlocks: '.nhud-info-block',
        promptPanel: '#nhud-prompt-panel',
        buttons: {
            history: '.nhud-btn-history',
            jsonEdit: '.nhud-btn-json-edit',
            settings: '.nhud-btn-settings',
        },
    },

    // CSS-классы
    classes: {
        hudVisible: 'nhud-visible',
        hudHidden: 'nhud-hidden',
        modalOpen: 'nhud-modal-open',
        trackerWarning: 'nhud-tracker-warning',
        trackerCritical: 'nhud-tracker-critical',
        characterActive: 'nhud-char-active',
        characterHidden: 'nhud-char-hidden',
        dragHandle: 'nhud-drag-handle',
        dragActive: 'nhud-dragging',
    },

    // Анимации
    animations: {
        fadeIn: 'nhud-fade-in',
        fadeOut: 'nhud-fade-out',
        slideIn: 'nhud-slide-in',
        slideOut: 'nhud-slide-out',
        pulse: 'nhud-pulse',
    },

    // Z-index слои
    zIndex: {
        hud: 9999,
        modal: 10000,
        tooltip: 10001,
        notification: 10002,
    },

    // Размеры
    sizes: {
        minHudWidth: 200,
        maxHudWidth: 600,
        defaultHudWidth: 300,
        minPromptWidth: 200,
        maxPromptWidth: 500,
        defaultPromptWidth: 300,
        trackerBarHeight: 20,
        characterCardMinHeight: 100,
    },

    // Дебаунсы (мс)
    debounce: {
        render: 100,
        resize: 200,
        input: 300,
        scroll: 50,
    },
};
