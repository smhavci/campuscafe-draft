import { Component, OnInit, signal } from '@angular/core';
import { AuthService, User } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [FormsModule], // FIX: RouterLink kaldırıldı (template'de kullanılmıyor)
    templateUrl: './profile.html',
    styleUrl: './profile.css'
})
export class Profile implements OnInit {
    user = signal<User | null>(null);
    loading = signal(true);
    saving  = signal(false);
    message = signal<{ text: string; type: 'success' | 'error' } | null>(null);
    activeSection = signal<'info' | 'password'>('info');

    infoForm = { firstName: '', lastName: '' };
    passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

    constructor(private authService: AuthService) { }

    ngOnInit(): void {
        this.authService.getProfile().subscribe({
            next: (user) => {
                this.user.set(user);
                this.infoForm.firstName = user.firstName;
                this.infoForm.lastName  = user.lastName;
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    saveInfo(): void {
        if (!this.infoForm.firstName.trim() || !this.infoForm.lastName.trim()) {
            this.showMessage('Ad ve soyad boş olamaz', 'error');
            return;
        }

        this.saving.set(true);
        this.authService.updateProfile({
            firstName: this.infoForm.firstName.trim(),
            lastName:  this.infoForm.lastName.trim()
        }).subscribe({
            next: (res) => {
                this.user.set(res.user);
                this.showMessage('Bilgiler güncellendi', 'success');
                this.saving.set(false);
            },
            error: (err) => {
                this.showMessage(err.error?.message || 'Güncelleme başarısız', 'error');
                this.saving.set(false);
            }
        });
    }

    savePassword(): void {
        if (!this.passwordForm.currentPassword) {
            this.showMessage('Mevcut şifrenizi girin', 'error');
            return;
        }
        if (this.passwordForm.newPassword.length < 6) {
            this.showMessage('Yeni şifre en az 6 karakter olmalıdır', 'error');
            return;
        }
        if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
            this.showMessage('Yeni şifreler eşleşmiyor', 'error');
            return;
        }

        this.saving.set(true);
        this.authService.updateProfile({
            currentPassword: this.passwordForm.currentPassword,
            newPassword:     this.passwordForm.newPassword
        }).subscribe({
            next: () => {
                this.showMessage('Şifre değiştirildi', 'success');
                this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
                this.saving.set(false);
            },
            error: (err) => {
                this.showMessage(err.error?.message || 'Şifre değiştirilemedi', 'error');
                this.saving.set(false);
            }
        });
    }

    getRoleLabel(role: string): string {
        const map: Record<string, string> = {
            student:   '🎓 Öğrenci',
            teacher:   '👨‍🏫 Akademisyen',
            cafeOwner: '☕ Kafe Sahibi'
        };
        return map[role] || role;
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    showMessage(text: string, type: 'success' | 'error'): void {
        this.message.set({ text, type });
        setTimeout(() => this.message.set(null), 3000);
    }
}
