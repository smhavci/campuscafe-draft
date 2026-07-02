import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserRole } from '../../core/services/auth.service';
import { CafeService, Cafe } from '../../core/services/cafe.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [RouterLink, FormsModule],
    templateUrl: './register.html',
    styleUrl: './register.css'
})
export class Register {
    step = signal<1 | 2>(1);
    selectedRole = signal<UserRole>('student');
    cafes = signal<Cafe[]>([]);
    loading = signal(false);
    error = signal('');

    // Form fields
    firstName = '';
    lastName = '';
    studentNumber = '';
    email = '';
    password = '';
    cafeId: number | null = null;

    constructor(
        private authService: AuthService,
        private cafeService: CafeService,
        private router: Router
    ) { }

    selectRole(role: UserRole): void {
        this.selectedRole.set(role);
        this.step.set(2);
        this.error.set('');

        if (role === 'cafeOwner') {
            this.cafeService.getCafes().subscribe(cafes => this.cafes.set(cafes));
        }
    }

    goBackToRoleSelect(): void {
        this.step.set(1);
        this.error.set('');
    }

    onSubmit(): void {
        this.loading.set(true);
        this.error.set('');

        const role = this.selectedRole();
        const payload: any = {
            role,
            firstName: this.firstName,
            lastName: this.lastName,
            password: this.password
        };

        if (role === 'student') {
            payload.studentNumber = this.studentNumber;
            if (this.email) payload.email = this.email;
        } else if (role === 'teacher') {
            payload.email = this.email;
        } else if (role === 'cafeOwner') {
            payload.email = this.email;
            payload.cafeId = this.cafeId;
        }

        this.authService.register(payload).subscribe({
            next: () => {
                this.loading.set(false);
                if (role === 'cafeOwner') {
                    this.router.navigate(['/dashboard']);
                } else {
                    this.router.navigate(['/']);
                }
            },
            error: err => {
                this.loading.set(false);
                this.error.set(err.error?.message || 'Kayıt başarısız');
            }
        });
    }
}
