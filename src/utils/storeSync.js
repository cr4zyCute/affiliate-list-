/**
 * Cross-tab Real-time Sync for Store updates
 * Uses BroadcastChannel (when supported) + storage event fallback
 */
const CHANNEL_NAME = 'affiliate_store_sync_channel';
const STORAGE_KEY = 'affiliate_store_last_updated';

export function broadcastStoreUpdate() {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: 'STORE_UPDATED', timestamp: Date.now() });
      channel.close();
    }
  } catch (err) {
    // ignore
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
  } catch (err) {
    // ignore
  }
}

export function subscribeToStoreUpdates(onUpdate) {
  let channel = null;

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === 'STORE_UPDATED') {
          onUpdate();
        }
      };
    }
  } catch (err) {
    // ignore
  }

  const handleStorage = (event) => {
    if (event.key === STORAGE_KEY) {
      onUpdate();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    if (channel) {
      try {
        channel.close();
      } catch (e) {
        // ignore
      }
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}
