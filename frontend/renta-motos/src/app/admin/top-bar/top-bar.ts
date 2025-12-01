import { Component, computed, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../core/auth'; // ajusta ruta

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss'
})
export class Topbar {
 @Input() title = 'Panel';
  @Output() menu = new EventEmitter<void>(); // para togglear sidebar en mobile

  private router = inject(Router);
  auth = inject(Auth);

  profileOpen = signal(false);
  toggleMenu() { this.menu.emit(); }
  toggleProfile() { this.profileOpen.update(v => !v); }
  closeProfile() { this.profileOpen.set(false); }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  initials = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return 'U';
    const name = (u.name || u.email || 'U').trim();
    const parts = name.split(' ');
    const first = parts[0]?.[0] ?? '';
    const last  = parts[1]?.[0] ?? '';
    return (first + last || first).toUpperCase();
  });
}