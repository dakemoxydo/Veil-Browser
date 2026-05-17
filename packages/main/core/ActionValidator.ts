import { VeilAction } from '@veil/shared';

const VALID_ACTION_TYPES = new Set([
  'TAB_NEW', 'TAB_CLOSE', 'TAB_NAVIGATE', 'TAB_FOCUS',
  'TAB_GO_BACK', 'TAB_GO_FORWARD', 'TAB_RELOAD', 'TAB_GO_HOME',
  'EXT_LOAD_UNPACKED', 'EXT_DIALOG_OPEN', 'ADBLOCK_TOGGLE',
  'BOOKMARK_ADD', 'BOOKMARK_REMOVE', 'HISTORY_CLEAR',
  'DOWNLOAD_CANCEL', 'DOWNLOAD_OPEN', 'DOWNLOAD_SHOW_IN_FOLDER',
  'SETTINGS_UPDATE',
]);

const ACTIONS_REQUIRING_ID = new Set([
  'TAB_CLOSE', 'TAB_NAVIGATE', 'TAB_FOCUS', 'TAB_GO_BACK',
  'TAB_GO_FORWARD', 'TAB_RELOAD', 'TAB_GO_HOME',
  'DOWNLOAD_CANCEL', 'DOWNLOAD_OPEN', 'DOWNLOAD_SHOW_IN_FOLDER',
  'BOOKMARK_REMOVE',
]);

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
    return true;
  }
}
