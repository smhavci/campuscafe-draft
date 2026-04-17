import { Component, signal, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { AIService } from '../../core/services/ai.service';
import { finalize } from 'rxjs/operators';
import { marked } from 'marked';

type ChatMode = 'assistant' | 'recommend' | 'preorder' | 'inventory' | 'campaign';

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    html?: SafeHtml;
    timestamp: Date;
}

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
    messages = signal<ChatMessage[]>([]);
    userInput = '';
    activeMode = signal<ChatMode>('assistant');
    @ViewChild('scrollMe') private scrollContainer?: ElementRef;

    private lastUserId: number | null = null;
    private readonly STORAGE_KEY = 'campuscafe_chat_history';

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
                this.loadHistory(userId);
                this.isOpen.set(false);
                // Kafe sahibi ise varsayılan mod değiştir
                if (user?.role === 'cafeOwner') {
                    this.activeMode.set('inventory');
                } else {
                    this.activeMode.set('assistant');
                }
            }
        });

        // Mesajlar her güncellendiğinde en aşağı kaydır
        effect(() => {
            this.messages(); // Signal izle
            this.scrollToBottom();
        });
    }

    get studentModes() {
        return [
            { id: 'assistant' as ChatMode, icon: '🤖', label: 'Akıllı Asistan' },
            { id: 'recommend' as ChatMode, icon: '🍽️', label: 'Yemek Önerisi' },
            { id: 'preorder' as ChatMode, icon: '⏰', label: 'Ön Sipariş' },
        ];
    }

    get ownerModes() {
        return [
            { id: 'inventory' as ChatMode, icon: '📊', label: 'Envanter' },
            { id: 'campaign' as ChatMode, icon: '🎯', label: 'Kampanya' },
        ];
    }

    get availableModes() {
        return this.auth.userRole() === 'cafeOwner' ? this.ownerModes : this.studentModes;
    }

    get placeholder(): string {
        switch (this.activeMode()) {
            case 'assistant': return 'Sorunu buraya yaz (ör: merhaba veya 50 TL bütçem var)...';
            case 'recommend': return 'Bütçeni yaz (ör: 50 TL)...';
            case 'preorder': return 'Ön sipariş hakkında sor...';
            case 'inventory': return 'Envanter hakkında sor...';
            case 'campaign': return 'Kampanya önerisi iste...';
        }
    }

    toggleChat() {
        this.isOpen.update(v => !v);
        if (this.isOpen() && this.messages().length === 0) {
            this.addWelcomeMessage();
        }
    }

    setMode(mode: ChatMode) {
        this.activeMode.set(mode);
    }

    addWelcomeMessage() {
        const role = this.auth.userRole();
        let text: string;
        if (role === 'cafeOwner') {
            text = 'Merhaba Patron! 👋 Mod seçerek envanter analizi veya kampanya önerisi alabirsin.';
        } else {
            text = 'Merhaba! 👋 Ben Akıllı Asistanın. Sana her konuda yardımcı olabilirim.';
        }
        this.messages.update(m => [...m, { role: 'ai', text, html: this.toSafeHtml(text), timestamp: new Date() }]);
    }

    sendMessage() {
        if (!this.userInput.trim() || this.isLoading()) return;

        const text = this.userInput;
        this.messages.update(m => [...m, { role: 'user', text, timestamp: new Date() }]);
        this.userInput = '';
        this.isLoading.set(true);

        const mode = this.activeMode();
        const user = this.auth.currentUser();

        switch (mode) {
            case 'assistant':
                this.ai.askGraph(text)
                    .pipe(finalize(() => this.isLoading.set(false)))
                    .subscribe({
                        next: (res: any) => this.addAIResponse(res.response),
                        error: () => this.addAIResponse('Üzgünüm, şu an cevap veremiyorum.')
                    });
                break;

            case 'recommend':
                this.ai.recommendMeal(text)
                    .pipe(finalize(() => this.isLoading.set(false)))
                    .subscribe({
                        next: (res: any) => this.addAIResponse(res.response),
                        error: () => this.addAIResponse('Üzgünüm, şu an öneri oluşturamıyorum.')
                    });
                break;

            case 'preorder':
                this.ai.predictPreOrder(
                    user?.id?.toString() || '1',
                    user?.cafeId?.toString() || '1'
                )
                    .pipe(finalize(() => this.isLoading.set(false)))
                    .subscribe({
                        next: (res: any) => this.addAIResponse(res.response),
                        error: () => this.addAIResponse('Üzgünüm, ön sipariş tahmini yapamıyorum.')
                    });
                break;

            case 'inventory':
                this.ai.getInventoryInsights(user?.cafeId?.toString() || '1')
                    .pipe(finalize(() => this.isLoading.set(false)))
                    .subscribe({
                        next: (res: any) => this.addAIResponse(res.response),
                        error: () => this.addAIResponse('Üzgünüm, envanter analizi yapamıyorum.')
                    });
                break;

            case 'campaign':
                this.ai.suggestCampaign(user?.cafeId?.toString() || '1')
                    .pipe(finalize(() => this.isLoading.set(false)))
                    .subscribe({
                        next: (res: any) => this.addAIResponse(res.response),
                        error: () => this.addAIResponse('Üzgünüm, kampanya önerisi oluşturamıyorum.')
                    });
                break;
        }
    }

    addAIResponse(text: string) {
        this.messages.update(m => [...m, { role: 'ai', text, html: this.toSafeHtml(text), timestamp: new Date() }]);
        this.saveHistory();
        this.scrollToBottom();
    }

    private scrollToBottom(): void {
        setTimeout(() => {
            if (this.scrollContainer) {
                const element = this.scrollContainer.nativeElement;
                element.scrollTop = element.scrollHeight;
            }
        }, 100);
    }

    formatTime(date: Date): string {
        return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    private toSafeHtml(markdown: string): SafeHtml {
        const rawHtml = marked.parse(markdown) as string;
        return this.sanitizer.bypassSecurityTrustHtml(rawHtml);
    }

    private saveHistory(): void {
        if (!this.lastUserId) return;
        const key = `${this.STORAGE_KEY}_${this.lastUserId}`;
        const msgs = this.messages().map(m => ({ role: m.role, text: m.text, timestamp: m.timestamp }));
        try {
            localStorage.setItem(key, JSON.stringify(msgs.slice(-30))); // Son 30 mesaj
        } catch {}
    }

    private loadHistory(userId: number | null): void {
        if (!userId) { this.messages.set([]); return; }
        const key = `${this.STORAGE_KEY}_${userId}`;
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const msgs = JSON.parse(raw) as { role: 'user' | 'ai'; text: string; timestamp: string }[];
                this.messages.set(msgs.map(m => ({
                    role: m.role,
                    text: m.text,
                    html: m.role === 'ai' ? this.toSafeHtml(m.text) : undefined,
                    timestamp: new Date(m.timestamp)
                })));
            } else {
                this.messages.set([]);
            }
        } catch {
            this.messages.set([]);
        }
    }

    get hoverMessage(): string {
        return this.auth.userRole() === 'cafeOwner'
            ? '📊 Kafe AI Asistan'
            : '🍽️ Bugün ne yesem?';
    }
}
