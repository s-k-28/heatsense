import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

export type ShareMessageResult = 'shared' | 'copied' | 'cancelled';
export type InviteShareResult = ShareMessageResult | 'error';
export type InviteShareAction = () => Promise<InviteShareResult>;

const cancelled = (reason: unknown) => typeof reason === 'object' && reason !== null && 'name' in reason && reason.name === 'AbortError';

/** Opens a user-controlled share sheet, or copies the message when web sharing is unavailable. */
export async function shareMessage(message: string): Promise<ShareMessageResult> {
  if (Platform.OS !== 'web') {
    try {
      const result = await Share.share({ message });
      return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
    } catch (reason) {
      if (cancelled(reason)) return 'cancelled';
      throw reason;
    }
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try { await navigator.share({ text: message }); return 'shared'; }
    catch (reason) { if (cancelled(reason)) return 'cancelled'; }
  }
  // A rejected/unavailable browser share falls back to a real clipboard operation.
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) await navigator.clipboard.writeText(message);
  else await Clipboard.setStringAsync(message);
  return 'copied';
}
