import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserRole } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [RouterLink, FormsModule],
    templateUrl: './login.html',
    styleUrl: './login.css'
})
export class Login {
    selectedRole = signal<UserRole>('student');
    loading = signal(false);
    error = signal('');

    studentNumber = '';
    email = '';
    password = '';

    constructor(private authService: AuthService, private router: Router) { }

    selectRole(role: UserRole): void {
        this.selectedRole.set(role);
        this.error.set('');
    }

    onSubmit(): void {
        this.loading.set(true);
        this.error.set('');

        const role = this.selectedRole();
        const payload: any = { role, password: this.password };

        if (role === 'student') {
            payload.studentNumber = this.studentNumber;
        } else {
            payload.email = this.email;
        }

        this.authService.login(payload).subscribe({
            next: (res) => {
                this.loading.set(false);
                if (res.user.role === 'cafeOwner') {
                    this.router.navigate(['/dashboard']);
                } else {
                    this.router.navigate(['/']);
                }
            },
            error: err => {
                this.loading.set(false);
                this.error.set(err.error?.message || 'Giriş başarısız');
            }
        });
    }
}
