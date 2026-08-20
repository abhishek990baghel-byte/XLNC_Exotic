import type { Material } from '../types';

class StockNotificationService {
  private notifiedItems = new Set<string>();
  private intervalId?: number;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (_) {
        return false;
      }
    }

    return false;
  }

  async checkStockLevels() {
    try {
      let materials: Material[] = [];

      try {
        const res = await fetch('/api/materials').catch(() => null);
        if (res && res.ok) {
          materials = await res.json().catch(() => []);
        }
      } catch (_) {
        // Fallback or handle error
      }

      if (!Array.isArray(materials) || materials.length === 0) return;
      
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return;

      const lowStockItems = materials.filter(m => m && typeof m.stock === 'number' && typeof m.min_stock === 'number' && m.stock < m.min_stock);
      const currentLowStockIds = new Set(lowStockItems.map(m => m.id));

      for (const item of lowStockItems) {
        if (item.id && !this.notifiedItems.has(item.id)) {
          this.notifiedItems.add(item.id);
          
          try {
            const notification = new Notification('Low Stock Alert', {
              body: `${item.name} is running low on stock. Only ${item.stock} ${item.unit || 'pcs'} remaining (minimum: ${item.min_stock}).`,
            });

            notification.onclick = () => {
              window.focus();
            };
          } catch (_) {}
        }
      }

      // Remove items from notified set if they are no longer low on stock
      for (const id of this.notifiedItems) {
        if (!currentLowStockIds.has(id)) {
          this.notifiedItems.delete(id);
        }
      }
    } catch (_) {
      // Graceful silent handling
    }
  }

  startMonitoring(intervalMs: number = 60000) {
    this.stopMonitoring();
    this.checkStockLevels();
    this.intervalId = window.setInterval(() => {
      this.checkStockLevels();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

export const stockNotificationService = new StockNotificationService();

