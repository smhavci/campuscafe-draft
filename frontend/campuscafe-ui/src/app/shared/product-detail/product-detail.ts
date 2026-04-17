import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Product, ProductOption, ProductOptionItem } from '../../core/services/product.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <button class="close-btn" (click)="close.emit()">✕</button>
          <div class="image-container">
            <img [src]="product.image" [alt]="product.name">
            <div class="image-overlay"></div>
          </div>
        </div>

        <!-- Info -->
        <div class="product-info">
          <h2 class="product-title">{{ product.name }}</h2>
          <p class="product-desc">{{ product.description }}</p>
          <div class="price-badge">{{ product.price | currency:'TRY':'₺':'1.0-0' }}</div>
        </div>

        <!-- Besin & Alerjen Bilgisi -->
        <div class="nutrition-section" *ngIf="product.calories !== undefined || product.allergens">
          <div class="nutrition-row">
            <div class="nutrition-item" *ngIf="product.calories !== undefined">
              <span class="nut-icon">🔥</span>
              <span class="nut-value">{{ product.calories }}</span>
              <span class="nut-label">kcal</span>
            </div>
            <div class="allergen-badges" *ngIf="product.allergens">
              <span class="allergen-badge" *ngFor="let a of getAllergenList()">
                {{ getAllergenIcon(a) }} {{ getAllergenLabel(a) }}
              </span>
            </div>
          </div>
          <div class="ingredients-row" *ngIf="product.ingredients">
            <span class="ing-label">İçindekiler:</span>
            <span class="ing-text">{{ product.ingredients }}</span>
          </div>
        </div>

        <!-- Options -->
        <div class="options-container" *ngIf="product.options && product.options.length > 0">
          <div class="option-group" *ngFor="let opt of product.options">
            <h3 class="option-title">
              {{ opt.name }}
              <span class="required-tag" *ngIf="opt.isRequired">Zorunlu</span>
            </h3>
            
            <div class="option-items">
              <div class="option-item" 
                   *ngFor="let item of opt.items"
                   [class.selected]="isItemSelected(opt.id, item.id)"
                   (click)="toggleOption(opt, item)">
                <div class="item-name">{{ item.name }}</div>
                <div class="item-price" *ngIf="item.extraPrice > 0">+{{ item.extraPrice | currency:'TRY':'₺':'1.0-0' }}</div>
                <div class="selection-indicator">
                   <div class="dot" *ngIf="isItemSelected(opt.id, item.id)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <div class="total-preview">
            <span class="total-label">Toplam:</span>
            <span class="total-val">{{ calculateTotalPrice() | currency:'TRY':'₺':'1.0-0' }}</span>
          </div>
          
          <div class="footer-actions">
            <!-- Save Favorite Section -->
            <div class="save-favorite-container" [class.active]="isSavingFavorite()">
              <ng-container *ngIf="isSavingFavorite()">
                <input type="text" 
                       #favName 
                       placeholder="Tarif Adı (örn: Sabah Keyfim)" 
                       (keyup.enter)="saveAsFavorite(favName.value)">
                
                <button class="confirm-save-btn" 
                        (click)="saveAsFavorite(favName.value)">
                  Kaydet
                </button>
              </ng-container>

              <button class="save-fav-btn" 
                      [title]="isSavingFavorite() ? 'İptal' : 'Favori Olarak Kaydet'"
                      (click)="toggleSaveFavorite()">
                <span class="btn-icon">⭐</span>
              </button>
            </div>

            <button class="add-btn" [disabled]="!canAddToCart()" (click)="onConfirm()">
              {{ product.id ? 'Sepete Ekle' : 'Güncelle' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ... existing styles ... */
    .modal-footer {
      padding: 1.25rem 1.5rem; background: #222; position: sticky; bottom: 0;
      display: flex; align-items: center; justify-content: space-between;
      border-top: 1px solid rgba(255,255,255,0.05);
      gap: 1rem;
    }
    .footer-actions { display: flex; align-items: center; gap: 0.75rem; flex: 1; justify-content: flex-end; }
    
    .save-favorite-container {
      display: flex; align-items: center; gap: 0.5rem;
      background: rgba(255,255,255,0.03); border-radius: 12px; padding: 0.25rem;
      transition: all 0.3s ease;
    }
    .save-favorite-container.active { background: rgba(200,169,126,0.1); padding: 0.25rem 0.5rem; }
    
    .save-favorite-container input {
      background: transparent; border: none; color: #fff; font-size: 0.85rem;
      width: 150px; outline: none; padding: 0.4rem;
    }
    
    .save-fav-btn {
      width: 42px; height: 42px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05); color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }
    .save-favorite-container.active .save-fav-btn { border-color: #ff4081; color: #ff4081; background: rgba(255,64,129,0.1); }
    .save-fav-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }
    
    .confirm-save-btn {
      background: #c8a97e; color: #000; border: none; padding: 0.5rem 0.75rem;
      border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer;
    }

    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      animation: fadeIn 0.3s ease;
    }
    .modal-content {
      background: #1a1a1a; width: 95%; max-width: 500px; max-height: 90vh;
      border-radius: 24px; overflow-y: auto; position: relative;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-header { position: relative; height: 260px; }
    .image-container { height: 100%; width: 100%; position: relative; }
    .image-container img { width: 100%; height: 100%; object-fit: cover; }
    .image-overlay {
      position: absolute; bottom: 0; left: 0; width: 100%; height: 60%;
      background: linear-gradient(transparent, #1a1a1a);
    }
    .close-btn {
      position: absolute; top: 1.5rem; right: 1.5rem; z-index: 10;
      width: 40px; height: 40px; border-radius: 50%; border: none;
      background: rgba(0,0,0,0.5); color: #fff; font-size: 1.2rem; cursor: pointer;
      backdrop-filter: blur(4px); transition: transform 0.2s;
    }
    .close-btn:hover { transform: scale(1.1); }

    .product-info { padding: 1.5rem; text-align: center; }
    .product-title { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.5rem; }
    .product-desc { color: rgba(255,255,255,0.5); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1rem; }
    .price-badge {
      display: inline-block; background: #c8a97e; color: #000;
      padding: 0.4rem 1.2rem; border-radius: 100px; font-weight: 800; font-size: 1.1rem;
    }

    .options-container { padding: 0 1.5rem 1.5rem; }
    .option-group { margin-bottom: 2rem; }
    .option-title { 
      font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: #fff;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .required-tag {
      font-size: 0.65rem; background: rgba(200,169,126,0.15); color: #c8a97e;
      padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase;
    }
    .option-items { display: flex; flex-direction: column; gap: 0.75rem; }
    .option-item {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px; padding: 1rem; display: flex; align-items: center;
      cursor: pointer; transition: all 0.2s; position: relative;
    }
    .option-item:hover { background: rgba(255,255,255,0.06); }
    .option-item.selected { border-color: #c8a97e; background: rgba(200,169,126,0.08); }
    .item-name { flex: 1; font-weight: 600; }
    .item-price { color: #c8a97e; font-weight: 700; margin-right: 1.5rem; }
    .selection-indicator { 
      width: 22px; height: 22px; border: 2px solid rgba(255,255,255,0.2); 
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
    }
    .option-item.selected .selection-indicator { border-color: #c8a97e; }
    .dot { width: 12px; height: 12px; background: #c8a97e; border-radius: 50%; }

    .total-preview { display: flex; flex-direction: column; }
    .total-label { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
    .total-val { font-size: 1.5rem; font-weight: 800; color: #fff; }
    .add-btn {
      background: #c8a97e; color: #000; border: none; padding: 1rem 2rem;
      border-radius: 16px; font-weight: 800; cursor: pointer; transition: all 0.2s;
    }
    .add-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(200,169,126,0.3); }
    .add-btn:disabled { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; }

    /* Besin & Alerjen */
    .nutrition-section {
      padding: 0 1.5rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 0.5rem;
    }
    .nutrition-row {
      display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.75rem;
    }
    .nutrition-item {
      display: flex; align-items: center; gap: 0.35rem;
      background: rgba(255,140,0,0.1); padding: 0.4rem 0.8rem; border-radius: 10px;
    }
    .nut-icon { font-size: 1rem; }
    .nut-value { font-weight: 800; font-size: 1.1rem; color: #ffa726; }
    .nut-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
    .allergen-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .allergen-badge {
      font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 8px;
      background: rgba(255,82,82,0.1); color: #ff8a80; border: 1px solid rgba(255,82,82,0.15);
    }
    .ingredients-row {
      font-size: 0.8rem; color: rgba(255,255,255,0.35); line-height: 1.4;
    }
    .ing-label { font-weight: 600; color: rgba(255,255,255,0.5); margin-right: 0.3rem; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ProductDetail {
  @Input({ required: true }) product!: Product;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<ProductOptionItem[]>();
  @Output() saveFavorite = new EventEmitter<{ name: string; options: ProductOptionItem[]; totalPrice: number }>();

  selectedItems = signal<Map<number, ProductOptionItem>>(new Map());
  isSavingFavorite = signal<boolean>(false);

  private allergenMap: Record<string, { icon: string; label: string }> = {
    'süt': { icon: '🥛', label: 'Süt' },
    'gluten': { icon: '🌾', label: 'Gluten' },
    'yumurta': { icon: '🥚', label: 'Yumurta' },
    'fındık': { icon: '🥜', label: 'Fındık' },
    'susam': { icon: '🫘', label: 'Susam' },
  };

  getAllergenList(): string[] {
    return (this.product.allergens || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  getAllergenIcon(key: string): string {
    return this.allergenMap[key]?.icon || '⚠️';
  }

  getAllergenLabel(key: string): string {
    return this.allergenMap[key]?.label || key;
  }

  toggleOption(option: ProductOption, item: ProductOptionItem): void {
    const current = new Map(this.selectedItems());
    
    if (option.type === 'radio') {
      option.items.forEach(i => current.delete(i.id));
      current.set(item.id, item);
    } else {
      if (current.has(item.id)) {
        current.delete(item.id);
      } else {
        current.set(item.id, item);
      }
    }
    this.selectedItems.set(current);
  }

  isItemSelected(optionId: number, itemId: number): boolean {
    return this.selectedItems().has(itemId);
  }

  calculateTotalPrice(): number {
    let total = this.product.price;
    this.selectedItems().forEach(item => total += item.extraPrice);
    return total;
  }

  canAddToCart(): boolean {
    if (!this.product.options) return true;
    for (const opt of this.product.options) {
      if (opt.isRequired) {
        const hasSelection = opt.items.some(item => this.selectedItems().has(item.id));
        if (!hasSelection) return false;
      }
    }
    return true;
  }

  onConfirm(): void {
    this.confirm.emit(Array.from(this.selectedItems().values()));
  }

  toggleSaveFavorite(): void {
    this.isSavingFavorite.update(v => !v);
  }

  saveAsFavorite(name: string): void {
    if (!name || name.trim().length === 0) {
      alert('Lütfen favori tarifiniz için bir isim girin.');
      return;
    }
    
    this.saveFavorite.emit({
      name: name,
      options: Array.from(this.selectedItems().values()),
      totalPrice: this.calculateTotalPrice()
    });
    
    this.isSavingFavorite.set(false);
  }
}
