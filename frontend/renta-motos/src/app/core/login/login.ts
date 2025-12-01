import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../auth';
import { Router, RouterModule } from '@angular/router';

type Status = 'idle'|'loading'|'ok'|'error';
@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule,RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);
  
  status = signal<Status>('idle');
  errorMsg = signal('');
  showPass = signal(false);
  togglePass() { this.showPass.update(v => !v); }
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

 submit() {
    if (this.form.invalid || this.status() === 'loading') return;
    this.status.set('loading'); this.errorMsg.set('');

    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.auth.fetchMe().subscribe();   //  cargamos el usuario
        this.status.set('ok');
        this.router.navigateByUrl('/admin/motos');
      },
      error: (err) => {
        this.status.set('error');
        this.errorMsg.set(err?.status === 401
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Intenta de nuevo.');
      }
    });
  }
}
