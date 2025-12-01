import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterModule, RouterOutlet } from '@angular/router';
import { Topbar } from '../../admin/top-bar/top-bar';
import { filter } from 'rxjs';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterOutlet, RouterModule, RouterLinkActive, Topbar],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class Admin {
   private router = inject(Router);

  open = signal(false);         // sidebar (mobile)
  openMotos = signal(true);     // submenu Motos
    openModelos  = signal(false);

  constructor() {
    // Auto-abrir “Motos” si estás en rutas /admin/motos...
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const u = this.router.url;
        this.openMotos.set(u.startsWith('/admin/motos'));
      });
  }


  toggle() { this.open.update(v => !v); }
  close()  { this.open.set(false); }

  toggleMotos()   { this.openMotos.update(v => !v); }
  toggleModelos() { this.openModelos.update(v => !v); }
}
