import messages from './messages.js';
import { getLanguage } from './locale.js';

// Keep source messages in state and translate when rendering so existing drafts
// and errors follow a language change without resetting the current screen.
const templates = Object.entries(messages).filter(([source]) => /\{\d+\}/.test(source)).map(([source, english]) => {
    const indexes = [];
    const pattern = source.split(/(\{\d+\})/).map(part => {
        if (/^\{\d+\}$/.test(part)) { indexes.push(part); return '(.+?)'; }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    return { pattern: new RegExp(`^${pattern}$`, 's'), indexes, english };
});

export function translate(source, values = [], lang = getLanguage()) {
    if (typeof source !== 'string') return source;
    let message = lang === 'en' ? (messages[source] ?? source) : source;
    if (lang === 'en' && message === source && /[가-힣]/.test(source)) {
        for (const template of templates) {
            const match = source.match(template.pattern);
            if (!match) continue;
            message = template.english.replace(/\{\d+\}/g, key => match[template.indexes.indexOf(key) + 1] ?? key);
            break;
        }
    }
    return message.replace(/\{(\d+)\}/g, (key, index) => values[index] ?? key);
}
