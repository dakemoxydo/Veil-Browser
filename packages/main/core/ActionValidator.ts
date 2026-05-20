import { VeilAction } from '@veil/shared';

const VALID_ACTION_TYPES = new Set([
  'TAB_NEW', 'TAB_CLOSE', 'TAB_RESTORE', 'TAB_NAVIGATE', 'TAB_FOCUS', 'TAB_REORDER',
  'TAB_GO_BACK', 'TAB_GO_FORWARD', 'TAB_RELOAD', 'TAB_GO_HOME',
  'TAB_PIN', 'TAB_MUTE', 'TAB_CLOSE_OTHERS', 'TAB_CLOSE_TO_RIGHT',
  'TAB_GROUP_CREATE', 'TAB_GROUP_DELETE', 'TAB_GROUP_RENAME', 'TAB_GROUP_TOGGLE',
  'TAB_MOVE_TO_GROUP',
  'EXT_LOAD_UNPACKED', 'EXT_DIALOG_OPEN', 'ADBLOCK_TOGGLE',
  'BOOKMARK_ADD', 'BOOKMARK_REMOVE', 'BOOKMARK_REORDER', 'BOOKMARK_UPDATE',
  'HISTORY_CLEAR', 'HISTORY_CLEAR_SINCE',
  'DOWNLOAD_CANCEL', 'DOWNLOAD_OPEN', 'DOWNLOAD_SHOW_IN_FOLDER', 'DOWNLOAD_CLEAR_HISTORY',
  'SETTINGS_UPDATE',
  'CERT_EXCEPTION_ADD', 'CERT_EXCEPTION_REMOVE',
  'SCRIPT_BLOCK_TOGGLE', 'SCRIPT_BLOCK_SITE',
]);

const ACTIONS_REQUIRING_ID = new Set([
  'TAB_CLOSE', 'TAB_NAVIGATE', 'TAB_FOCUS', 'TAB_GO_BACK',
  'TAB_GO_FORWARD', 'TAB_RELOAD', 'TAB_GO_HOME',
  'TAB_PIN', 'TAB_MUTE', 'TAB_CLOSE_OTHERS', 'TAB_CLOSE_TO_RIGHT',
  'TAB_GROUP_DELETE', 'TAB_GROUP_RENAME', 'TAB_GROUP_TOGGLE',
  'DOWNLOAD_CANCEL', 'DOWNLOAD_OPEN', 'DOWNLOAD_SHOW_IN_FOLDER',
  'BOOKMARK_REMOVE', 'BOOKMARK_UPDATE',
]);

const ACTIONS_REQUIRING_URL_TITLE = new Set([
  'BOOKMARK_ADD',
]);

const ACTIONS_REQUIRING_URL = new Set([
  'TAB_NAVIGATE',
]);

const ACTIONS_REQUIRING_PATH = new Set([
  'EXT_LOAD_UNPACKED',
]);

const ACTIONS_REQUIRING_OBJECT_PAYLOAD = new Set([
  'SETTINGS_UPDATE',
  'TAB_GROUP_CREATE',
]);

const ACTIONS_REQUIRING_SOURCE_TARGET = new Set([
  'TAB_REORDER', 'BOOKMARK_REORDER',
]);

const ACTIONS_REQUIRING_TABID = new Set([
  'TAB_MOVE_TO_GROUP',
]);

const MAX_LENGTHS = {
  id: 100,
  url: 2000,
  title: 500,
  path: 1000,
} as const;

export class ActionValidator {
  public isValid(action: unknown): action is VeilAction {
    if (!action || typeof action !== 'object') return false;
    const a = action as Record<string, unknown>;
    if (typeof a.type !== 'string') return false;
    if (!VALID_ACTION_TYPES.has(a.type)) return false;
    if (ACTIONS_REQUIRING_ID.has(a.type)) {
      const payload = a.payload as Record<string, unknown> | undefined;
      if (!payload || typeof payload.id !== 'string' || payload.id.length === 0) return false;
    }
    if (ACTIONS_REQUIRING_URL_TITLE.has(a.type)) {
      const payload = a.payload as Record<string, unknown> | undefined;
      if (!payload || typeof payload.url !== 'string' || payload.url.length === 0) return false;
      if (!payload || typeof payload.title !== 'string') return false;
    }
    if (ACTIONS_REQUIRING_URL.has(a.type)) {
      const payload = a.payload as Record<string, unknown> | undefined;
      if (!payload || typeof payload.url !== 'string' || payload.url.length === 0) return false;
    }
    if (ACTIONS_REQUIRING_PATH.has(a.type)) {
      const payload = a.payload as Record<string, unknown> | undefined;
      if (!payload || typeof payload.path !== 'string' || payload.path.length === 0) return false;
    }
    if (ACTIONS_REQUIRING_SOURCE_TARGET.has(a.type)) {
      const payload = a.payload as Record<string, unknown> | undefined;
      if (!payload || typeof payload.sourceId !== 'string' || payload.sourceId.length === 0) return false;
      if (!payload || typeof payload.targetId !== 'string' || payload.targetId.length === 0) return false;
    }
    if (ACTIONS_REQUIRING_TABID.has(a.type)) {
      const payload = a.payload as Record<string, unknown> | undefined;
      if (!payload || typeof payload.tabId !== 'string' || payload.tabId.length === 0) return false;
    }
    if (ACTIONS_REQUIRING_OBJECT_PAYLOAD.has(a.type)) {
      const payload = a.payload;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    }
    // String length limits to prevent DoS
    const payload = a.payload as Record<string, unknown> | undefined;
    if (payload) {
      if (typeof payload.id === 'string' && payload.id.length > MAX_LENGTHS.id) return false;
      if (typeof payload.url === 'string' && payload.url.length > MAX_LENGTHS.url) return false;
      if (typeof payload.title === 'string' && payload.title.length > MAX_LENGTHS.title) return false;
      if (typeof payload.path === 'string' && payload.path.length > MAX_LENGTHS.path) return false;
    }
    return true;
  }
}
