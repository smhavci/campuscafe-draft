import { Component, signal, computed, effect, ViewChild, ElementRef } from '@angular/core';
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

interface ApprovalState {
    threadId: string;
    proposal: string;
}

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chatbot.html',
    styleUrl: './chatbot.css'
})
export class ChatbotComponent {
    isOpen       = signal(false);
    isHovered    = signal(false);
    isLoading    = signal(false);
    messages     = signal<ChatMessage[]>([]);
    userInput    = '';
    activeMode   = signal<ChatMode>('assistant');
    threadId     = signal<string | null>(null);
    pendingApproval = signal<ApprovalState | null>(null);

    @ViewChild('scrollMe') private scrollContainer?: ElementRef;

    private lastUserId: number | null = null;
    private readonly STORAGE_KEY = 'campuscafe_chat_history';

    readonly modeConfig: Record<ChatMode, { icon: string; label: string; description: string; role: 'customer' | 'owner'; quickActions: string[] }> = {
        assistant: {
            icon: '✦',
            label: 'Asistan',
            description: 'Her konuda sorabilirsin',
            role: 'customer',
            quickActions: ['Ne yesem bugün?', 'Popüler ürünler neler?', 'Bütçeme göre öner']
        },
        recommend: {
            icon: '🍽️',
            label: 'Öneri',
            description: 'Bütçene ve tercihine göre yemek önerisi',
            role: 'customer',
            quickActions: ['150 TL bütçem var', 'Vejetaryen seçenekler', 'Hafif bir şeyler öner', 'En değerli kombo ne?']
        },
        preorder: {
            icon: '⚡',
            label: 'Ön Sipariş',
            description: 'Sırayı atla, önceden sipariş ver',
            role: 'customer',
            quickActions: ['Alışkanlığıma göre öner', 'Saat 12\'de hazır olsun', 'Öğle arası için planla']
        },
        inventory: {
            icon: '📊',
            label: 'Stok',
            description: 'Kafe stok ve satış analizi',
            role: 'owner',
            quickActions: ['Stok durumunu analiz et', 'Hangi ürünler tükeniyor?', 'Bugünkü satış trendi']
        },
        campaign: {
            icon: '🎯',
            label: 'Kampanya',
            description: 'AI destekli kampanya önerisi ve onayı',
            role: 'owner',
            quickActions: ['Flash sale öner', 'Yavaş satanlar için indirim', 'Hafta sonu kampanyası']
        },
    };

    constructor(
        public auth: AuthService,
        private ai: AIService,
        private sanitizer: DomSanitizer
    ) {
        effect(() => {
            const user = this.auth.currentUser();
            const userId = user?.id ?? null;
            if (userId !== this.lastUserId) {
                this.lastUserId = userId;
                this.loadHistory(userId);
                this.isOpen.set(false);
                this.threadId.set(null);
                this.pendingApproval.set(null);
                this.activeMode.set(user?.role === 'cafeOwner' ? 'inventory' : 'assistant');
            }
        });

        effect(() => {
            this.messages();
            this.scrollToBottom();
        });
    }

    get availableModes(): ChatMode[] {
        return this.auth.userRole() === 'cafeOwner'
            ? ['inventory', 'campaign']
            : ['assistant', 'recommend', 'preorder'];
    }

    get currentModeConfig() {
        return this.modeConfig[this.activeMode()];
    }

    get placeholder(): string {
        const cfg = this.modeConfig[this.activeMode()];
        const examples: Record<ChatMode, string> = {
            assistant: 'Bir şeyler sor veya yaz...',
            recommend: 'Bütçeni veya tercihini yaz (örn: 150 TL, vejetaryen)...',
            preorder:  'Ne zaman ve ne almak istiyorsun?',
            inventory: 'Hangi konuda analiz yapalım?',
            campaign:  'Nasıl bir kampanya istiyorsun?',
        };
        return examples[this.activeMode()];
    }

    get userInitials(): string {
        const user = this.auth.currentUser();
        if (!user) return '?';
        return ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || '?';
    }

    get hoverMessage(): string {
        return this.auth.userRole() === 'cafeOwner' ? 'Kafe AI Asistan' : 'Bugün ne yesem?';
    }

    get hasMessages(): boolean {
        return this.messages().length > 0;
    }

    toggleChat() {
        this.isOpen.update(v => !v);
        if (this.isOpen() && this.messages().length === 0) {
            this.addWelcomeMessage();
        }
    }

    setMode(mode: ChatMode) {
        if (this.activeMode() === mode) return;
        this.activeMode.set(mode);
    }

    useQuickAction(action: string) {
        this.userInput = action;
        this.sendMessage();
    }

    addWelcomeMessage() {
        const isOwner = this.auth.userRole() === 'cafeOwner';
        const firstName = this.auth.currentUser()?.firstName ?? '';
        const greeting = firstName ? `Merhaba ${firstName}! 👋` : 'Merhaba! 👋';
        const text = isOwner
            ? `${greeting} Ben kafe asistanın. Stok analizi ya da kampanya önerisi için buraya yazabilirsin.`
            : `${greeting} Ben CampusCafe AI asistanın. Yemek önerisi, ön sipariş veya aklına takılan her şeyi sorabilirsin.`;
        this.addAIMessage(text);
    }

    sendMessage() {
        if (!this.userInput.trim() || this.isLoading()) return;

        const text = this.userInput.trim();
        this.userInput = '';
        this.messages.update(m => [...m, { role: 'user', text, timestamp: new Date() }]);
        this.isLoading.set(true);

        const user = this.auth.currentUser();
        const mode = this.activeMode();
        const cfg  = this.modeConfig[mode];

        // Tüm modlar LangGraph üzerinden gidiyor — thread_id ile bağlam korunur
        const role   = this.auth.userRole() === 'cafeOwner' ? 'owner' : cfg.role;
        const cafeId = user?.cafeId?.toString() ?? null;

        this.ai.askGraph(text, this.threadId(), role, cafeId)
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
                next: (res: any) => {
                    if (res.thread_id) this.threadId.set(res.thread_id);

                    if (res.status === 'awaiting_approval') {
                        // Human-in-the-Loop: kampanya onayı gerekiyor
                        this.addAIMessage(res.campaign_proposal);
                        this.pendingApproval.set({ threadId: res.thread_id, proposal: res.campaign_proposal });
                    } else {
                        this.pendingApproval.set(null);
                        this.addAIMessage(res.response ?? 'Yanıt alınamadı.');
                    }
                },
                error: (err: any) => {
                    console.error('AI graph request failed:', err);
                    this.addAIMessage('Şu an bağlantı kuramıyorum. Lütfen tekrar dene.');
                }
            });
    }

    approveCampaign(decision: 'evet' | 'hayır') {
        const state = this.pendingApproval();
        if (!state) return;

        const label = decision === 'evet' ? '✓ Kampanyayı onayladım' : '✗ Kampanyayı iptal ettim';
        this.messages.update(m => [...m, { role: 'user', text: label, timestamp: new Date() }]);
        this.pendingApproval.set(null);
        this.isLoading.set(true);

        this.ai.resumeCampaign(state.threadId, decision)
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
                next: (res: any) => this.addAIMessage(res.response ?? 'İşlem tamamlandı.'),
                error: (err: any) => {
                    console.error('Campaign resume failed:', err);
                    this.addAIMessage('Kampanya işlenirken bir hata oluştu.');
                }
            });
    }

    clearHistory() {
        this.messages.set([]);
        this.threadId.set(null);
        this.pendingApproval.set(null);
        if (this.lastUserId) {
            localStorage.removeItem(`${this.STORAGE_KEY}_${this.lastUserId}`);
        }
        this.addWelcomeMessage();
    }

    addAIMessage(text: string) {
        this.messages.update(m => [...m, {
            role: 'ai',
            text,
            html: this.toSafeHtml(text),
            timestamp: new Date()
        }]);
        this.saveHistory();
    }

    private scrollToBottom(): void {
        setTimeout(() => {
            if (this.scrollContainer) {
                this.scrollContainer.nativeElement.scrollTop =
                    this.scrollContainer.nativeElement.scrollHeight;
            }
        }, 80);
    }

    formatTime(date: Date): string {
        return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    private toSafeHtml(markdown: string): SafeHtml {
        const raw = marked.parse(markdown) as string;
        return this.sanitizer.bypassSecurityTrustHtml(raw);
    }

    private saveHistory(): void {
        if (!this.lastUserId) return;
        const msgs = this.messages().map(m => ({ role: m.role, text: m.text, timestamp: m.timestamp }));
        try {
            localStorage.setItem(
                `${this.STORAGE_KEY}_${this.lastUserId}`,
                JSON.stringify(msgs.slice(-30))
            );
        } catch (e) {
            console.warn('Chat geçmişi kaydedilemedi:', e);
        }
    }

    private loadHistory(userId: number | null): void {
        if (!userId) { this.messages.set([]); return; }
        try {
            const raw = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
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
        } catch (e) {
            console.warn('Chat geçmişi yüklenemedi:', e);
            this.messages.set([]);
        }
    }
}
