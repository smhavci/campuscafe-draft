import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './navbar.html',
    styleUrl: './navbar.css'
})
export class Navbar {
    constructor(
        public cartService: CartService,
        public authService: AuthService,
        public notificationService: NotificationService
    ) { }

    logout(): void {
        this.authService.logout();
    }
}
