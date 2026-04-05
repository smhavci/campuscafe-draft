import { Component, signal, effect, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { AIService } from '../../core/services/ai.service';
import { finalize } from 'rxjs/operators';
import { marked } from 'marked';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class ChatbotComponent {
  isOpen = signal(false);
  isHovered = signal(false);
  isLoading = signal(false);
  messages = signal<{ role: 'user' | 'ai', text: string, html?: SafeHtml }[]>([]);
  userInput = '';

  private lastUserId: number | null = null;

  constructor(
    public auth: AuthService,
    private ai: AIService,
    private sanitizer: DomSanitizer
  ) {
    // Kullanıcı değişince sohbet geçmişini temizle
    effect(() => {
      const user = this.auth.currentUser();
      const userId = user?.id ?? null;
      if (userId !== this.lastUserId) {
        this.lastUserId = userId;
        this.messages.set([]);
        this.isOpen.set(false);
      }
    });
  }

  toggleChat() {
    this.isOpen.update(v => !v);
    if (this.isOpen() && this.messages().length === 0) {
      this.addWelcomeMessage();
    }
  }

  addWelcomeMessage() {
    const role = this.auth.userRole();
    let text: string;
    if (role === 'cafeOwner') {
      text = 'Merhaba Patron! Kafe verilerini analiz etmemi veya kampanya önerisi yapmamı ister misin?';
    } else {
      text = 'Merhaba! Bugün bütçene uygun en iyi yemeği seçmene yardımcı olabilirim. Ne kadar bütçen var?';
    }
    this.messages.update(m => [...m, { role: 'ai', text, html: this.toSafeHtml(text) }]);
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isLoading()) return;

    const text = this.userInput;
    this.messages.update(m => [...m, { role: 'user', text }]);
    this.userInput = '';
    this.isLoading.set(true);

    const role = this.auth.userRole();

    if (role === 'cafeOwner') {
      this.ai.getInventoryInsights(this.auth.currentUser()?.cafeId?.toString() || '1')
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (res: any) => this.addAIResponse(res.response),
          error: () => this.addAIResponse('Üzgünüm, şu an analiz yapamıyorum.')
        });
    } else {
      this.ai.recommendMeal(text)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (res: any) => this.addAIResponse(res.response),
          error: () => this.addAIResponse('Üzgünüm, şu an öneri oluşturamıyorum.')
        });
    }
  }

  addAIResponse(text: string) {
    this.messages.update(m => [...m, { role: 'ai', text, html: this.toSafeHtml(text) }]);
  }

  private toSafeHtml(markdown: string): SafeHtml {
    const rawHtml = marked.parse(markdown) as string;
    return this.sanitizer.bypassSecurityTrustHtml(rawHtml);
  }

  get hoverMessage(): string {
    return this.auth.userRole() === 'cafeOwner'
      ? '📊 Kafe durumunu analiz et'
      : '🍽️ Bugün ne yesem?';
  }
}
