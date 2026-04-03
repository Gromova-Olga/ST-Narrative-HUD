// utils/string/Transliterator.js

/**
 * Транслитерация кириллицы в латиницу
 */

const _translitMap = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e',
    'ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m',
    'н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u',
    'ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch',
    'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
};

/**
 * Транслитерирует строку (кириллица → латиница, нижний регистр)
 */
export function transliterate(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().split('').map(c => _translitMap[c] ?? c).join('');
}

/**
 * Обратная карта (латиница → кириллица, приблизительно)
 */
const _reverseMap = {
    'a':'а','b':'б','v':'в','g':'г','d':'д','e':'е',
    'zh':'ж','z':'з','i':'и','y':'й','k':'к','l':'л','m':'м',
    'n':'н','o':'о','p':'p','r':'р','s':'с','t':'т','u':'у',
    'f':'ф','h':'х','ts':'ц','ch':'ч','sh':'sh','sch':'щ',
    'yu':'ю','ya':'я'
};

/**
 * Обратная транслитерация (латиница → кириллица, приблизительно)
 */
export function reverseTransliterate(str) {
    if (!str || typeof str !== 'string') return '';
    let result = str.toLowerCase();
    // Сначала обрабатываем многосимвольные комбинации
    Object.entries(_reverseMap)
        .filter(([key]) => key.length > 1)
        .sort((a, b) => b[0].length - a[0].length)
        .forEach(([lat, cyr]) => {
            result = result.split(lat).join(cyr);
        });
    return result;
}
