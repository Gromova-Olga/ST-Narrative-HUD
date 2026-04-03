// ui/components/panels/GlobalSettingsModal.js
// �������� �� _UIManager.internal.js

import { getSettings, getLive } from '../../../core/StateManager.js';
import { applyDesignTheme, closeGlobalSettings, openGlobalSettings, startInteractiveTour, renderCharacters, renderRelationships, renderTrackers } from '../../_UIManager.internal.js';
import { saveSettingsDebounced } from '../../../../../../script.js';

export function buildGlobalSettingsModal() {
    if ($("#nhud-global-settings").length) return;
    
    const settings = getSettings();
    const d = settings.design || {};
    const ui = settings.ui || {};
    const m = settings.modules || {};
    const p = settings.prompts || {};

    $("body").append(`
        <div id="nhud-global-settings" style="display:none; position:fixed; top:40px; bottom:20px; z-index:9992; background:var(--nhud-cen-bg, #151220); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--nhud-cen-head, linear-gradient(180deg, #2a101a, #1a0a10)); padding:10px 15px; border-bottom:1px solid var(--nhud-border, #4a1525);">
                <span style="font-weight:bold; color:var(--nhud-cen-text, #e0c0c0);">🎨 Внешний вид и Система</span>
                <button id="nhud-global-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); font-size:18px; cursor:pointer; padding:0;">✕</button>
            </div>
            
            <div style="display:flex; flex-wrap:wrap; background:rgba(0,0,0,0.4); border-bottom:1px solid var(--nhud-border, #3a1525); flex-shrink:0;">
                <button class="nhud-g-tab active" data-tab="visuals" style="flex:1; padding:8px; background:none; border:none; color:var(--nhud-cen-text, #e0c0c0); font-weight:bold; cursor:pointer;">🎨 Внешний вид</button>
                <button class="nhud-g-tab" data-tab="system" style="flex:1; padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">⚙️ Система</button>
                <button class="nhud-g-tab" data-tab="faq" style="flex:1; padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">❓ FAQ & Обучение</button>
            </div>
            
            <div id="nhud-global-content" style="flex:1; overflow-y:auto; padding:15px; background:rgba(0,0,0,0.2);">
                <div class="nhud-g-tab-content active" data-tab="visuals" style="display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <button id="nhud-theme-mimic" class="nhud-send-btn" style="flex:1; padding:8px; background:#2a101a; border:1px solid #5a2035; color:#e0c0c0; border-radius:4px; cursor:pointer;">🎭 Мимикрировать под ST</button>
                        <button id="nhud-theme-reset" class="nhud-send-btn" style="flex:1; padding:8px; background:#2a101a; border:1px solid #5a2035; color:#e0c0c0; border-radius:4px; cursor:pointer;">🔄 Сбросить дизайн</button>
                    </div>

                    <details class="nhud-design-acc" style="background:var(--nhud-cen-inp, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;"><summary class="nhud-cen-head" style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">⚙️ 1. Левая панель (Настройки)</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                            <div class="nhud-field-group">
                                <label>Режим вкладок</label>
                                <select id="nhud-d-tabsMode" class="nhud-select" style="width:100%;">
                                    <option value="top-text" ${ui.tabsMode === 'top-text' ? 'selected' : ''}>Сверху (Иконка + Текст)</option>
                                    <option value="top-icon" ${ui.tabsMode === 'top-icon' ? 'selected' : ''}>Сверху (Только иконки)</option>
                                    <option value="side-icon" ${ui.tabsMode === 'side-icon' ? 'selected' : ''}>Сбоку (Только иконки)</option>
                                </select>
                            </div>
                            
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <div><label style="font-size:11px; color:#a08080;">Цвет фона</label><input id="nhud-d-leftBgC" type="color" value="${d.leftBgC || '#140a0f'}" style="width:100%; height:30px;"/></div>
                                <div><label style="font-size:11px; color:#a08080;">Прозрачность фона</label><input id="nhud-d-leftBgO" type="range" min="0" max="1" step="0.05" value="${d.leftBgO ?? 0.95}" style="width:100%;"/></div>
                                <div style="grid-column: span 2;"><input id="nhud-d-leftBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.leftBgI || ''}" /></div>

                                <div><label style="font-size:11px; color:#a08080;">Цвет границ</label><input id="nhud-d-border" type="color" value="${d.borderColor || '#4a1525'}" style="width:100%; height:30px;"/></div>
                                <div><label style="font-size:11px; color:#a08080;">Тус. текст</label><input id="nhud-d-textMu" type="color" value="${d.textMuted || '#a08080'}" style="width:100%; height:30px;"/></div>

                                <div><label style="font-size:11px; color:#a08080;">Цвет текста</label><input id="nhud-d-leftTxtC" type="color" value="${d.leftTxtC || '#e0b0b0'}" style="width:100%; height:30px;"/></div>
                                <div><label style="font-size:11px; color:#a08080;">Размер текста (px)</label><input id="nhud-d-leftTxtS" type="number" value="${d.leftTxtS || 12}" class="nhud-input" style="width:100%;"/></div>
                            </div>

                            <div style="border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Заголовки и Гармошки</div>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                    <div><label style="font-size:10px; color:#a08080;">Цвет текста заг.</label><input id="nhud-d-leftHeadTxtC" type="color" value="${d.leftHeadTxtC || d.accent || '#d05070'}" style="width:100%; height:25px;"/></div>
                                    <div><label style="font-size:10px; color:#a08080;">Размер заг. (px)</label><input id="nhud-d-leftHeadS" type="number" value="${d.leftHeadS || 13}" class="nhud-input" style="width:100%;"/></div>
                                    <div><label style="font-size:10px; color:#a08080;">Цвет фона (шапки)</label><input id="nhud-d-leftHeadC" type="color" value="${d.leftHeadC || '#000000'}" style="width:100%; height:25px;"/></div>
                                    <div><label style="font-size:10px; color:#a08080;">Прозрачность шапки</label><input id="nhud-d-leftHeadO" type="range" min="0" max="1" step="0.05" value="${d.leftHeadO ?? 0.2}" style="width:100%;"/></div>
                                </div>
                            </div>

                            <div style="border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Поля ввода (Inputs)</div>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                    <div><label style="font-size:10px; color:#a08080;">Цвет полей</label><input id="nhud-d-leftInpC" type="color" value="${d.leftInpC || '#000000'}" style="width:100%; height:25px;"/></div>
                                    <div><label style="font-size:10px; color:#a08080;">Прозрачность</label><input id="nhud-d-leftInpO" type="range" min="0" max="1" step="0.05" value="${d.leftInpO ?? 0.3}" style="width:100%;"/></div>
                                </div>
                            </div>
                        </div>
                    </details>
                    
                    <details class="nhud-design-acc" style="background:var(--nhud-cen-inp, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;"><summary class="nhud-cen-head" style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">📊 2. Правая панель (HUD)</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                            <div class="nhud-field-group">
                                <label>Отображение мыслей (💭)</label>
                                <select id="nhud-d-thoughtsMode" class="nhud-select" style="width:100%;">
                                    <option value="individual" ${ui.thoughtsMode === 'individual' ? 'selected' : ''}>У каждого персонажа</option>
                                    <option value="unified" ${ui.thoughtsMode === 'unified' ? 'selected' : ''}>Единым окном (Кнопка)</option>
                                </select>
                            </div>
                            <label style="display:flex; align-items:center; gap:8px; color:var(--nhud-cen-text); cursor:pointer;">
                                <input type="checkbox" id="nhud-d-showEmoji" ${d.showStatusEmojis !== false ? 'checked' : ''}> Показывать смайлики (👗, 🎭)
                            </label>
                            <div style="border-top: 1px dashed var(--nhud-border); padding-top: 8px;">
                                <label style="display:flex; align-items:center; gap:8px; color:var(--nhud-cen-text); cursor:pointer; margin-bottom:8px;">
                                    <input type="checkbox" id="nhud-d-barDyn" ${d.barDynamic !== false ? 'checked' : ''}> Градиент полосок (от %%)
                                </label>
                                <div style="display:flex; gap:10px; align-items:center;">
                                    <input id="nhud-d-barS" type="color" value="${d.barColorStart || '#52e0a3'}" style="width:30px; height:25px;"/> <span style="font-size:11px;">100%</span>
                                    <input id="nhud-d-barE" type="color" value="${d.barColorEnd || '#e05252'}" style="width:30px; height:25px;"/> <span style="font-size:11px;">0%</span>
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <div><label style="font-size:11px; color:#a08080;">Цвет фона</label><input id="nhud-d-hudBgC" type="color" value="${d.hudBgC || '#140a0f'}" style="width:100%; height:30px;"/></div>
                                <div><label style="font-size:11px; color:#a08080;">Прозрачность фона</label><input id="nhud-d-hudBgO" type="range" min="0" max="1" step="0.05" value="${d.hudBgO ?? 0.95}" style="width:100%;"/></div>
                                <div style="grid-column: span 2;"><input id="nhud-d-hudBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.hudBgI || ''}" /></div>
                                
                                <div><label style="font-size:11px; color:#a08080;">Цвет текста</label><input id="nhud-d-hudTxtC" type="color" value="${d.hudTxtC || '#e0b0b0'}" style="width:100%; height:30px;"/></div>
                                <div><label style="font-size:11px; color:#a08080;">Размер текста (px)</label><input id="nhud-d-hudTxtS" type="number" value="${d.hudTxtS || 12}" class="nhud-input" style="width:100%;"/></div>
                            </div>

                            <div style="border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Поля ввода (Inputs)</div>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                    <div><label style="font-size:10px; color:#a08080;">Цвет полей</label><input id="nhud-d-hudInpC" type="color" value="${d.hudInpC || '#000000'}" style="width:100%; height:25px;"/></div>
                                    <div><label style="font-size:10px; color:#a08080;">Прозрачность</label><input id="nhud-d-hudInpO" type="range" min="0" max="1" step="0.05" value="${d.hudInpO ?? 0.3}" style="width:100%;"/></div>
                                </div>
                            </div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:var(--nhud-cen-inp, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;"><summary class="nhud-cen-head" style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">🎨 3. Центральное окно (Где мы сейчас)</summary>
                        <div style="padding:10px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <div><label style="font-size:11px; color:#a08080;">Цвет фона</label><input id="nhud-d-cenBgC" type="color" value="${d.cenBgC || '#151220'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:11px; color:#a08080;">Прозрачность фона</label><input id="nhud-d-cenBgO" type="range" min="0" max="1" step="0.05" value="${d.cenBgO ?? 0.98}" style="width:100%;"/></div>
                            <div style="grid-column: span 2;"><input id="nhud-d-cenBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.cenBgI || ''}" /></div>
                            
                            <div><label style="font-size:11px; color:#a08080;">Цвет текста</label><input id="nhud-d-cenTxtC" type="color" value="${d.cenTxtC || '#e0c0c0'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:11px; color:#a08080;">Размер текста (px)</label><input id="nhud-d-cenTxtS" type="number" value="${d.cenTxtS || 12}" class="nhud-input" style="width:100%;"/></div>
                            
                            <div style="grid-column: span 2; border-top:1px dashed var(--nhud-border); padding-top:10px; margin-top:5px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Заголовки и Гармошки</div>
                            </div>
                            <div><label style="font-size:10px; color:#a08080;">Цвет текста заг.</label><input id="nhud-d-cenHeadTxtC" type="color" value="${d.cenHeadTxtC || '#e0c0c0'}" style="width:100%; height:25px;"/></div>
                            <div><label style="font-size:10px; color:#a08080;">Размер заг. (px)</label><input id="nhud-d-cenHeadS" type="number" value="${d.cenHeadS || 14}" class="nhud-input" style="width:100%;"/></div>
                            <div><label style="font-size:10px; color:#a08080;">Цвет фона (шапки)</label><input id="nhud-d-cenHeadC" type="color" value="${d.cenHeadC || '#2a101a'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:10px; color:#a08080;">Прозрачность шапки</label><input id="nhud-d-cenHeadO" type="range" min="0" max="1" step="0.05" value="${d.cenHeadO ?? 0.3}" style="width:100%;"/></div>

                            <div style="grid-column: span 2; border-top:1px dashed var(--nhud-border); padding-top:10px; margin-top:5px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Поля ввода (Inputs)</div>
                            </div>
                            <div><label style="font-size:10px; color:#a08080;">Цвет полей</label><input id="nhud-d-cenInpC" type="color" value="${d.cenInpC || '#000000'}" style="width:100%; height:25px;"/></div>
                            <div><label style="font-size:10px; color:#a08080;">Прозрачность</label><input id="nhud-d-cenInpO" type="range" min="0" max="1" step="0.05" value="${d.cenInpO ?? 0.2}" style="width:100%;"/></div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:var(--nhud-cen-inp, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;"><summary class="nhud-cen-head" style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">💬 4. Всплывающие окна (Инвентарь, Промпты...)</summary>
                        <div style="padding:10px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <div class="nhud-field-group" style="grid-column: span 2;"><label>Ширина окна промптов (px)</label><input id="nhud-d-prmW" class="nhud-input" type="number" min="200" max="800" value="${d.promptWidth || 300}" /></div>
                            
                            <label style="grid-column: span 2; display:flex; align-items:center; gap:8px; color:var(--nhud-cen-text); cursor:pointer;">
                                <input type="checkbox" id="nhud-d-prmMerge" ${d.promptMerged ? 'checked' : ''}> Слить шапку с фоном (Монолит)
                            </label>
                            
                            <div><label style="font-size:11px; color:#a08080;">Цвет шапки окна</label><input id="nhud-d-popHeadC" type="color" value="${d.popHeadC || '#2a101a'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:11px; color:#a08080;">Прозр. шапки окна</label><input id="nhud-d-popHeadO" type="range" min="0" max="1" step="0.05" value="${d.popHeadO ?? 1}" style="width:100%;"/></div>

                            <div><label style="font-size:11px; color:#a08080;">Цвет фона</label><input id="nhud-d-popBgC" type="color" value="${d.popBgC || '#1a0a10'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:11px; color:#a08080;">Прозрачность фона</label><input id="nhud-d-popBgO" type="range" min="0" max="1" step="0.05" value="${d.popBgO ?? 0.95}" style="width:100%;"/></div>
                            <div style="grid-column: span 2;"><input id="nhud-d-popBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.popBgI || ''}" /></div>
                            
                            <div><label style="font-size:11px; color:#a08080;">Цвет текста</label><input id="nhud-d-popTxtC" type="color" value="${d.popTxtC || '#e0b0b0'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:11px; color:#a08080;">Размер текста (px)</label><input id="nhud-d-popTxtS" type="number" value="${d.popTxtS || 14}" class="nhud-input" style="width:100%;"/></div>

                            <div style="grid-column: span 2; border-top:1px dashed var(--nhud-border); padding-top:10px; margin-top:5px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Поля ввода (Inputs)</div>
                            </div>
                            <div><label style="font-size:10px; color:#a08080;">Цвет полей</label><input id="nhud-d-popInpC" type="color" value="${d.popInpC || '#000000'}" style="width:100%; height:25px;"/></div>
                            <div><label style="font-size:10px; color:#a08080;">Прозрачность</label><input id="nhud-d-popInpO" type="range" min="0" max="1" step="0.05" value="${d.popInpO ?? 0.3}" style="width:100%;"/></div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:var(--nhud-cen-inp, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;"><summary class="nhud-cen-head" style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">🧊 5. Плавающий виджет и CSS</summary>
                        <div style="padding:10px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <div><label style="font-size:12px; color:#a08080;">Фон кубика</label><input id="nhud-d-widC" type="color" value="${d.widBgColor || '#140a0f'}" style="width:100%; height:30px; cursor:pointer;"/></div>
                            <div><label style="font-size:12px; color:#a08080;">Прозрачность кубика</label><input id="nhud-d-widO" type="range" min="0" max="1" step="0.05" value="${d.widBgOpacity ?? 0.95}" style="width:100%;"/></div>
                            <div style="grid-column: span 2;"><input id="nhud-d-widI" class="nhud-input" type="text" placeholder="URL картинки для кубика..." value="${d.widBgImage || ''}" /></div>
                            
                            <div><label style="font-size:12px; color:#a08080;">Цвет текста/иконок</label><input id="nhud-d-widTxtC" type="color" value="${d.widTxtC || '#ffffff'}" style="width:100%; height:30px; cursor:pointer;"/></div>
                            <div><label style="font-size:12px; color:#a08080;">Размер иконок (px)</label><input id="nhud-d-widTxtS" type="number" value="${d.widTxtS || 14}" class="nhud-input" style="width:100%;"/></div>

                            <div style="grid-column: span 2; display:flex; gap:10px; align-items:center; border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <input id="nhud-d-accent" type="color" value="${d.accent || '#d05070'}" style="width:30px; height:30px;"/>
                                <label style="font-size:12px; color:#a08080;">Основной акцентный цвет (Кнопки, иконки)</label>
                            </div>
                            <textarea id="nhud-d-css" class="nhud-textarea" rows="4" placeholder="/* Твой CSS код */" style="grid-column: span 2; box-sizing:border-box; font-family:monospace; font-size:11px; margin-top:5px;">${d.customCss || ''}</textarea>
                        </div>
                    </details>
                </div>

                <div class="nhud-g-tab-content" data-tab="system" style="display:none; flex-direction:column; gap:10px;">
                <details class="nhud-design-acc" style="background:rgba(20,0,0,0.4); border:1px solid #802030; border-radius:4px; padding:5px; margin-bottom:10px;" open>
                        <summary class="nhud-cen-head" style="cursor:pointer; color:#e05252; font-weight:bold; outline:none; padding:5px;">📊 Расход токенов (Примерная оценка)</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--nhud-cen-text);">
                            <div style="display:flex; justify-content:space-between;"><span>Системные инструкции:</span><span id="nhud-tokens-sys">0</span></div>
                            <div style="display:flex; justify-content:space-between;"><span>Кастомные блоки:</span><span id="nhud-tokens-custom">0</span></div>
                            <div style="display:flex; justify-content:space-between;"><span>Структура JSON (Скелет):</span><span>190</span></div>
                            <div style="border-top:1px dashed #802030; margin:4px 0;"></div>
                            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px; color:#e0c0c0;"><span>Итого к запросу:</span><span><span id="nhud-tokens-total">0</span> токенов</span></div>
                            <div style="font-size:9px; color:#a08080; margin-top:4px;">* Оценка примерная. 1 токен ≈ 4 англ. символа или 2 рус. символа. Зависит от модели.</div>
                        </div>
                    </details>
                    <div style="background: rgba(200,50,80,0.1); padding: 10px; border: 1px solid var(--nhud-border); border-radius: 4px; margin-bottom:10px;">
                        <label style="color:#d0d0a0; font-weight:bold; font-size:12px;">🌐 Язык ответов (Language)</label>
                        <input id="nhud-p-lang" class="nhud-input" type="text" value="${p.language || 'Russian'}" style="margin-top:4px;" />
                        <label style="color:#d0d0a0; font-weight:bold; font-size:12px; display:block; margin-top:10px;">🧠 Главный системный промпт</label>
                        <textarea id="nhud-p-sys" class="nhud-textarea" rows="3" style="margin-top:4px;">${p.system}</textarea>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#52a8e0;"><input type="checkbox" id="nhud-m-trackers" ${m.trackers?'checked':''}> 📊 Трекеры (Здоровье и др.)</label>
                            <textarea id="nhud-p-trackers" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.trackersPrompt}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#e080b0;"><input type="checkbox" id="nhud-m-calendar" ${m.calendar !== false ? 'checked' : ''}> 📅 Календарь событий</label>
                            <textarea id="nhud-p-calendar" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.calendarPrompt || ''}</textarea>
                        </div>
                        
                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#b080e0;"><input type="checkbox" id="nhud-m-chars" ${m.characters?'checked':''}> 👥 Персонажи (Одежда/Мысли)</label>
                            <textarea id="nhud-p-chars" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.charsPrompt}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#e0d0a0;"><input type="checkbox" id="nhud-m-date" ${m.datetime?'checked':''}> 🌤️ Дата, время и погода</label>
                            <textarea id="nhud-p-date" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.datetimePrompt}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#52e0a3;"><input type="checkbox" id="nhud-m-achievements" ${m.achievements?'checked':''}> 🏆 Ачивки (Зал Славы)</label>
                            <textarea id="nhud-p-ach" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.achievementsPrompt}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#52a8e0;"><input type="checkbox" id="nhud-m-hero" ${m.hero !== false ? 'checked' : ''}> 🧬 Герой (Опыт и Статы)</label>
                            <textarea id="nhud-p-hero" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.heroPrompt}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#e0c0a0;"><input type="checkbox" id="nhud-m-quests" ${m.quests !== false ? 'checked' : ''}> 📜 Журнал квестов</label>
                            <textarea id="nhud-p-quests" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.questsPrompt || 'If a new quest starts or an active one updates/finishes, generate a "quests" array containing objects with "title", "desc", and "status" (active/completed/failed).'}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#b080e0;"><input type="checkbox" id="nhud-m-codex" ${m.codex !== false ? 'checked' : ''}> 📖 Сюжетный Кодекс</label>
                            <textarea id="nhud-p-codex" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.codexPrompt || "If you introduce new important lore, factions, secrets, or concepts, unlock a lorebook entry using the JSON field 'codex_unlocked' containing 'title' and 'text'."}</textarea>
                        </div>
                        
                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#e05252;"><input type="checkbox" id="nhud-m-factions" ${m.factions !== false ? 'checked' : ''}> 🏴‍☠️ Фракции (Репутация)</label>
                            <textarea id="nhud-p-factions" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.factionsPrompt || 'If the user interacts with factions, update their reputation using the JSON object "factions" (e.g. {"Faction Name": 60}).'}</textarea>
                        </div>
                    </div>

                    <div style="margin-top:10px; border:1px dashed var(--nhud-border); padding:10px; border-radius:4px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <div style="grid-column: span 2; font-size:11px; color:#a08080; margin-bottom:5px;">Модули без промптов (работают локально или вшиты):</div>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-rel" ${m.relationships?'checked':''}> ❤️ Отношения (Трекер)</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-inv" ${m.inventory !== false ? 'checked' : ''}> 🎒 Имущество (Инвентарь/Деньги)</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-thoughts" ${m.thoughts?'checked':''}> 💭 Мысли персонажей</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-blocks" ${m.customBlocks?'checked':''}> 🧩 Кастомные блоки</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-analytics" ${m.analytics !== false ? 'checked':''}> 📈 Графики аналитики</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-blocksUI" ${m.beautifulBlocks !== false ? 'checked' : ''}> ✨ Красивые инфоблоки внутри чата (БЕЗ токенов)</label>
                        
                        <div style="<div style="grid-column: span 2; border-top:1px solid var(--nhud-border); margin-top:5px; padding-top:10px;">
                            <label class="nhud-checkbox-group" style="color:#e0c0e0;"><input type="checkbox" id="nhud-m-outfitStats" ${m.enableOutfitStats ? 'checked' : ''}> &#127899; ����� ������ (�������� + ������)</label>
                            <label class="nhud-checkbox-group" style="color:#e0c0e0;"><input type="checkbox" id="nhud-m-outfitTrack" ${m.enableOutfitTracking !== false ? 'checked' : ''}> &#127899; ������������ ��������� ��</label>
                            <label class="nhud-checkbox-group" style="color:#c0d0e0;"><input type="checkbox" id="nhud-m-notifications" ${m.notifications !== false ? 'checked' : ''}> &#9993;&#65039; ����������� �����������</label>
                            <label class="nhud-checkbox-group" style="color:#52e0a3;"><input type="checkbox" id="nhud-m-trackPlayer" ${m.trackPlayerInventory !== false ? 'checked' : ''}> &#127890; ����-��������� ������</label>
                            <label class="nhud-checkbox-group" style="color:#e0a352;"><input type="checkbox" id="nhud-m-trackBot" ${m.trackBotInventory !== false ? 'checked' : ''}> &#129302; ����-��������� ����</label>
                            <div style="margin-top:8px;">
                                <label style="color:#d0d0a0; font-size:11px;">&#128241; �������� ���������� �����</label>
                                <input id="nhud-p-deviceName" class="nhud-input" type="text" value="${p.notificationDeviceName || '��������'}" style="margin-top:2px;" />
                            </div>
                            <div style="margin-top:8px;">
                                <label style="color:#d0d0a0; font-size:11px;">&#128176; ������� �������� ����</label>
                                <textarea id="nhud-p-botWealth" class="nhud-textarea" rows="2" style="margin-top:2px; font-size:11px;">${p.botWealthStatus || ''}</textarea>
                            </div>
                        </div>grid-column: span 2; border-top:1px solid var(--nhud-border); margin-top:5px; padding-top:10px;">
                            <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-lore"  ${m.loreInjection?'checked':''}> 🧠 Динамическая память (Вшивка лора)</label>
                            <div class="nhud-field-group" style="display: flex; align-items: center; gap: 10px; padding-left: 25px; margin-top: 5px;">
                                <span style="color:var(--nhud-text-muted); font-size: 11px;">Куда вшивать память:</span>
                                <select id="nhud-m-lore-mode" class="nhud-select" style="flex:1; padding:4px;">
                                    <option value="system" ${m.loreMode === 'system' || !m.loreMode ? 'selected' : ''}>⚙️ В Системный промпт (Надежно)</option>
                                    <option value="user" ${m.loreMode === 'user' ? 'selected' : ''}>👤 В последнее сообщение</option>
                                    <option value="note" ${m.loreMode === 'note' ? 'selected' : ''}>📝 Как Заметку Автора</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="nhud-g-tab-content" data-tab="faq" style="display:none; flex-direction:column; gap:10px; align-items:center; justify-content:center; padding:20px; text-align:center;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎓</div>
                    <h3 style="color:var(--nhud-accent); margin-top:0;">Добро пожаловать в Narrative HUD!</h3>
                    <p style="color:var(--nhud-text-main); font-size:14px; margin-bottom:20px;">Пройдите краткий интерактивный тур, чтобы узнать, как пользоваться всеми панелями.</p>
                    <button id="nhud-start-tour-btn" class="nhud-send-btn" style="padding:10px 20px; font-size:14px; background:var(--nhud-accent); border:none; border-radius:8px; cursor:pointer; color:#fff; font-weight:bold; box-shadow:0 4px 15px rgba(208, 80, 112, 0.4);">🚀 Запустить обучение</button>
                </div>

            </div>
    `);

    function updateGlobalTokenTracker() {
        const s = getSettings();
        const m = s.modules || {};
        const p = s.prompts || {};
        
        let sysText = p.system || "";
        if(m.trackers) sysText += p.trackersPrompt || "";
        if(m.characters) sysText += p.charsPrompt || "";
        if(m.datetime) sysText += p.datetimePrompt || "";
        if(m.achievements) sysText += p.achievementsPrompt || "";
        if(m.hero !== false) sysText += p.heroPrompt || "";
        if(m.quests !== false) sysText += p.questsPrompt || "";
        if(m.codex !== false) sysText += p.codexPrompt || "";
        if(m.factions !== false) sysText += p.factionsPrompt || "";

        let customText = (s.promptBlocks || []).filter(b => b.enabled).map(b => b.prompt).join(" ");

        const calc = (text) => {
            if (!text) return 0;
            let t = 0;
            for(let i=0; i<text.length; i++) {
                const c = text.charCodeAt(i);
                if(c >= 1024 && c <= 1279) t += 0.5; else t += 0.25;
            }
            return Math.ceil(t);
        };

        const sysTokens = calc(sysText);
        const customTokens = calc(customText);
        const jsonTokens = 190;
        
        $("#nhud-tokens-sys").text(sysTokens);
        $("#nhud-tokens-custom").text(customTokens);
        $("#nhud-tokens-total").text(sysTokens + customTokens + jsonTokens);
    }

    function saveAndApply() { saveSettingsDebounced(); applyDesignTheme(); updateGlobalTokenTracker(); }
    updateGlobalTokenTracker(); // Запускаем при открытии

    const modBinds = { trackers: '#nhud-m-trackers', relationships: '#nhud-m-rel', characters: '#nhud-m-chars', thoughts: '#nhud-m-thoughts', customBlocks: '#nhud-m-blocks', datetime: '#nhud-m-date', analytics: '#nhud-m-analytics', loreInjection: '#nhud-m-lore', achievements: '#nhud-m-achievements', hero: '#nhud-m-hero', inventory: '#nhud-m-inv', quests: '#nhud-m-quests', codex: '#nhud-m-codex', factions: '#nhud-m-factions', calendar: '#nhud-m-calendar', enableOutfitStats: '#nhud-m-outfitStats', enableOutfitTracking: '#nhud-m-outfitTrack', notifications: '#nhud-m-notifications', trackPlayerInventory: '#nhud-m-trackPlayer', trackBotInventory: '#nhud-m-trackBot' };
    for (const [key, id] of Object.entries(modBinds)) {
        $(id).on("change", e => { getSettings().modules[key] = e.target.checked; saveAndApply(); });
    }

    $("#nhud-p-lang").on("input", e => { getSettings().prompts.language = e.target.value; saveAndApply(); });
    $("#nhud-p-deviceName").on("input", e => { getSettings().prompts.notificationDeviceName = e.target.value; saveAndApply(); });
    $("#nhud-p-botWealth").on("input", e => { getSettings().prompts.botWealthStatus = e.target.value; saveAndApply(); }); 
    $("#nhud-p-sys").on("input", e => { getSettings().prompts.system = e.target.value; saveAndApply(); });
    $("#nhud-p-trackers").on("input", e => { getSettings().prompts.trackersPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-chars").on("input", e => { getSettings().prompts.charsPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-date").on("input", e => { getSettings().prompts.datetimePrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-ach").on("input", e => { getSettings().prompts.achievementsPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-hero").on("input", e => { getSettings().prompts.heroPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-quests").on("input", e => { getSettings().prompts.questsPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-codex").on("input", e => { getSettings().prompts.codexPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-factions").on("input", e => { getSettings().prompts.factionsPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-calendar").on("input", e => { getSettings().prompts.calendarPrompt = e.target.value; saveAndApply(); });

    $("#nhud-d-tabsMode").on("change", e => { getSettings().ui.tabsMode = e.target.value; saveAndApply(); });
    $("#nhud-d-thoughtsMode").on("change", e => { getSettings().ui.thoughtsMode = e.target.value; saveAndApply(); renderCharacters(); });
    
    // ДОБАВИЛ СЮДА ВСЕ НОВЫЕ ПОЛЯ ДЛЯ КРАСИВОГО СЕЙВА
    const binds = {
        borderColor: '#nhud-d-border', textMuted: '#nhud-d-textMu', accent: '#nhud-d-accent', customCss: '#nhud-d-css',
        
        leftBgC: '#nhud-d-leftBgC', leftBgO: '#nhud-d-leftBgO', leftBgI: '#nhud-d-leftBgI', 
        leftTxtC: '#nhud-d-leftTxtC', leftTxtS: '#nhud-d-leftTxtS',
        leftHeadC: '#nhud-d-leftHeadC', leftHeadO: '#nhud-d-leftHeadO', leftHeadTxtC: '#nhud-d-leftHeadTxtC', leftHeadS: '#nhud-d-leftHeadS',
        leftInpC: '#nhud-d-leftInpC', leftInpO: '#nhud-d-leftInpO',
        
        hudBgC: '#nhud-d-hudBgC', hudBgO: '#nhud-d-hudBgO', hudBgI: '#nhud-d-hudBgI', 
        hudTxtC: '#nhud-d-hudTxtC', hudTxtS: '#nhud-d-hudTxtS',
        hudInpC: '#nhud-d-hudInpC', hudInpO: '#nhud-d-hudInpO',
        
        cenBgC: '#nhud-d-cenBgC', cenBgO: '#nhud-d-cenBgO', cenBgI: '#nhud-d-cenBgI', 
        cenTxtC: '#nhud-d-cenTxtC', cenTxtS: '#nhud-d-cenTxtS',
        cenHeadC: '#nhud-d-cenHeadC', cenHeadO: '#nhud-d-cenHeadO', cenHeadTxtC: '#nhud-d-cenHeadTxtC', cenHeadS: '#nhud-d-cenHeadS',
        cenInpC: '#nhud-d-cenInpC', cenInpO: '#nhud-d-cenInpO',
        
        popBgC: '#nhud-d-popBgC', popBgO: '#nhud-d-popBgO', popBgI: '#nhud-d-popBgI', 
        popTxtC: '#nhud-d-popTxtC', popTxtS: '#nhud-d-popTxtS',
        popHeadC: '#nhud-d-popHeadC', popHeadO: '#nhud-d-popHeadO',
        popInpC: '#nhud-d-popInpC', popInpO: '#nhud-d-popInpO', promptWidth: '#nhud-d-prmW',
        
        widBgColor: '#nhud-d-widC', widBgOpacity: '#nhud-d-widO', widBgImage: '#nhud-d-widI', 
        widTxtC: '#nhud-d-widTxtC', widTxtS: '#nhud-d-widTxtS',
        
        barColorStart: '#nhud-d-barS', barColorEnd: '#nhud-d-barE'
    };

    for (const [key, id] of Object.entries(binds)) {
        $(id).on("input", e => { 
            const val = (e.target.type === 'range' || e.target.type === 'number') ? parseFloat(e.target.value) : e.target.value;
            getSettings().design[key] = val; saveAndApply(); 
        });
    }

    $("#nhud-d-prmMerge").on("change", e => { getSettings().design.promptMerged = e.target.checked; saveAndApply(); });
    $("#nhud-d-showEmoji").on("change", e => { getSettings().design.showStatusEmojis = e.target.checked; saveAndApply(); renderCharacters(); });
    $("#nhud-d-barDyn").on("change", e => { 
        getSettings().design.barDynamic = e.target.checked; saveAndApply(); 
        renderRelationships(); renderTrackers(); 
        import('./SettingsUI.js').then(m => { if(m.renderSettingsTrackers) m.renderSettingsTrackers(); });
    });

    $(document).off("click", "#nhud-theme-mimic").on("click", "#nhud-theme-mimic", () => {
        if (!confirm("Попытаться скопировать цвета из текущей темы SillyTavern?")) return;
        const rs = getComputedStyle(document.documentElement);
        const bg = rs.getPropertyValue('--SmartThemeBodyColor').trim() || '#151220';
        const txt = rs.getPropertyValue('--SmartThemeQuoteColor').trim() || '#e0c0c0';
        const border = rs.getPropertyValue('--SmartThemeBorderColor').trim() || '#4a1525';
        const accent = rs.getPropertyValue('--SmartThemeUserMesColor').trim() || '#d05070';
        
        const d = getSettings().design;
        d.leftBgC = d.hudBgC = d.cenBgC = d.popBgC = d.widBgColor = bg;
        d.leftTxtC = d.hudTxtC = d.cenTxtC = d.popTxtC = txt;
        d.borderColor = border;
        d.accent = accent;
        
        import('../../../../../script.js').then(s => s.saveSettingsDebounced());
        applyDesignTheme();
        closeGlobalSettings(); 
        setTimeout(() => openGlobalSettings(), 200);
    });

    $(document).off("click", "#nhud-theme-reset").on("click", "#nhud-theme-reset", () => {
        if (!confirm("Сбросить дизайн до заводских настроек?")) return;
        getSettings().design = { hudBgColor: "#140a0f", hudBgOpacity: 0.95, setBgColor: "#140a0f", setBgOpacity: 0.95, cenBgColor: "#151220", cenBgOpacity: 0.98, inputBgColor: "#000000", inputBgOpacity: 0.3, borderColor: "#4a1525", textMain: "#e0b0b0", textMuted: "#a08080", accent: "#d05070", customCss: "" };
        import('../../../../../script.js').then(s => s.saveSettingsDebounced());
        applyDesignTheme();
        closeGlobalSettings(); 
        setTimeout(() => openGlobalSettings(), 200);
    });

    $("#nhud-global-settings").off("click", ".nhud-g-tab").on("click", ".nhud-g-tab", function() {
        const tab = $(this).data("tab");
        $(".nhud-g-tab").css({ color: "var(--nhud-text-muted, #a08080)", fontWeight: "normal" });
        $(this).css({ color: "var(--nhud-cen-text, #e0c0c0)", fontWeight: "bold" });
        $(".nhud-g-tab-content").hide();
        $(`.nhud-g-tab-content[data-tab="${tab}"]`).css("display", "flex").hide().fadeIn(200);
    });
    
    $(document).off("click", "#nhud-global-close").on("click", "#nhud-global-close", closeGlobalSettings);
    
    $(document).off("click", "#nhud-start-tour-btn").on("click", "#nhud-start-tour-btn", () => {
        startInteractiveTour();
    });
}
