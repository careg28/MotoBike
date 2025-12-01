import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { Modelos } from '../../core/services/modelos';
import { ModeloApi } from '../../core/modelo-api';
import type { Modelo } from '../../core/models/modelo.model';
import type { Paginated } from '../../core/models/paginated.type';

@Component({
  selector: 'app-modelos-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './modelos-list.html',
  styleUrls: ['./modelos-list.scss'],
})
export class ModelosList {
  private svc = inject(Modelos);
  private api = inject(ModeloApi);
  private router = inject(Router);

  // estado UI
  loading   = signal(false);
  error     = signal<string | null>(null);

  // filtros / paginación
  search    = signal('');
  page      = signal(1);
  perPage   = signal<number | 'all'>(10);

  // datos
  data      = signal<Paginated<Modelo> | null>(null);
  items     = signal<Modelo[]>([]);

  // borrado
  toDelete  = signal<Modelo | null>(null);
  deleting  = signal(false);
  deleteErr = signal<string | null>(null);
  hardDelete = signal(false); // por si quieres un borrado definitivo más adelante

  ngOnInit() {
    this.load();
  }

  trackById = (_: number, m: Modelo) => m.id;

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.svc.list({
      search: this.search(),
      page:   this.page(),
      per_page: this.perPage(),
    }).subscribe({
      next: (res) => {
        this.data.set(res);
        this.items.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'No se pudo cargar el listado.');
      }
    });
  }

  // toolbar
  onSearchInput(ev: Event) {
    const value = (ev.target as HTMLInputElement).value;
    this.search.set(value);
  }
  applyFilters() {
    this.page.set(1);
    this.load();
  }

  // paginación
  goToPage(p: number) {
    if (!this.data()) return;
    const last = this.data()!.last_page || 1;
    const np = Math.min(Math.max(1, p), last);
    if (np !== this.page()) {
      this.page.set(np);
      this.load();
    }
  }

  // acciones
  nuevo() {
    this.router.navigate(['/admin/modelos/nuevo']);
  }
  editar(m: Modelo) {
    this.router.navigate(['/admin/modelos/editar', m.slug]);
  }

  pedirBorrado(m: Modelo) {
    this.toDelete.set(m);
    this.deleteErr.set(null);
    this.hardDelete.set(false);
  }
  cancelarBorrado() {
    this.toDelete.set(null);
    this.deleting.set(false);
    this.deleteErr.set(null);
  }
  confirmarBorrado() {
    const m = this.toDelete();
    if (!m) return;

    this.deleting.set(true);
    this.deleteErr.set(null);

    this.api.remove(m.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toDelete.set(null);
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.deleteErr.set(err?.error?.message || 'No se pudo eliminar el modelo.');
      }
    });
  }
}