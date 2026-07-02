import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, CommonModule],
    templateUrl: './navbar.html',
    styleUrl: './navbar.css'
})
export class Navbar {
    notifPanelOpen = signal(false);

    constructor(
        public cartService: CartService,
        public authService: AuthService,
        public notificationService: NotificationService,
        private router: Router,
    ) { }

    logout(): void {
        this.authService.logout();
    }

    toggleNotifPanel() {
        this.notifPanelOpen.update(v => !v);
        if (this.notifPanelOpen()) {
            this.notificationService.markAllRead();
        }
    }

    goToNotif(link?: string) {
        this.notifPanelOpen.set(false);
        if (link) this.router.navigateByUrl(link);
    }
}
