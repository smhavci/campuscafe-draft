import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-container">
      @for (toast of notif.toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type" (click)="notif.dismissToast(toast.id)">
          <span class="toast-icon">{{ getIcon(toast.type) }}</span>
          <div class="toast-body">
            <div class="toast-title">{{ toast.title }}</div>
            <div class="toast-msg">{{ toast.message }}</div>
          </div>
          <button class="toast-close">×</button>
        </div>
      }
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 9999;
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-width: 300px;
      max-width: 360px;
      background: #1e1e2e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      cursor: pointer;
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
    .toast-order_ready  { border-left: 4px solid #22c55e; }
    .toast-stars_earned { border-left: 4px solid #f59e0b; }
    .toast-order_item_cancelled { border-left: 4px solid #ef4444; }
    .toast-new_order    { border-left: 4px solid #3b82f6; }
    .toast-icon { font-size: 1.4rem; flex-shrink: 0; }
    .toast-body { flex: 1; }
    .toast-title { font-size: 0.88rem; font-weight: 700; color: #fff; margin-bottom: 2px; }
    .toast-msg   { font-size: 0.78rem; color: rgba(255,255,255,0.6); }
    .toast-close {
      background: none; border: none; color: rgba(255,255,255,0.3);
      cursor: pointer; font-size: 1.1rem; padding: 0; line-height: 1;
    }
  `]
})
export class ToastComponent {
    constructor(public notif: NotificationService) {}

    getIcon(type: string): string {
        const icons: Record<string, string> = {
            order_ready: '✅',
            stars_earned: '⭐',
            order_item_cancelled: '❌',
            new_order: '🛎️',
            order_updated: '🔄',
        };
        return icons[type] ?? '🔔';
    }
}
