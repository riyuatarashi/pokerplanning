/** Universal logger (always on) */
const PREFIX_STYLE = 'background:#8b5cf6;color:#fff;padding:2px 4px;border-radius:3px;font-weight:bold;';
function basePrint(level, emoji, args){
  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  try { console[method](`%c${emoji} [PP:${level.toUpperCase()}]`, PREFIX_STYLE, ...args); } catch { /* noop */ }
}
export function log(...args){ basePrint('log','🐾', args); }
export function info(...args){ basePrint('info','ℹ️', args); }
export function debug(...args){ basePrint('debug','🔍', args); }
export function warn(...args){ basePrint('warn','⚠️', args); }
export function error(...args){ basePrint('error','💥', args); }
// Convenience alias
export const logger = { log, info, debug, warn, error };
