import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MotoApi } from '../../core/moto-api';

import type { AdminMotoDto } from '../../core/models/admin-moto.dto'; // ⬅️ sin .ts
import { AdminMotoVM, Estado } from '../../core/mappers/admin-moto.vm';
import { mapAdminMotos, fromCatalogMoto } from '../../core/mappers/admin-moto.mapper';

import { MODELS as CATALOG } from '../../features/models/models.data';

@Component({
  selector: 'app-listado-motos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './listado-motos.html',
  styleUrls: ['./listado-motos.scss'] // ⬅️ plural
})
export class ListadoMotos {
  private api = inject(MotoApi);
  private router = inject(Router);

  data = signal<AdminMotoVM[]>([]);
  loading = signal(false);

  search = signal('');
  estado = signal<Estado | 'todos'>('todos');
  libresAhora = signal(false);

  // eliminar
  toDelete   = signal<AdminMotoVM | null>(null);
  deleting   = signal(false);
  deleteError= signal<string | null>(null);
  hardDelete = signal(false);

  // ⬅️ vuelve a cargar al entrar
  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    const params: any = { per_page: 'all' };

    const q = this.search().trim();
    if (q) params.search = q;

    const est = this.estado();
    if (est !== 'todos') params.estado = est;

    if (this.libresAhora()) params.asignada = 0;

    this.api.list(params).subscribe({
      next: (r: any) => {
        const items: AdminMotoDto[] = Array.isArray(r) ? r : (r?.data ?? []);
        const vms = items.length ? mapAdminMotos(items) : CATALOG.map(fromCatalogMoto);
        this.data.set(vms);
        this.loading.set(false);
      },
      error: () => {
        this.data.set(CATALOG.map(fromCatalogMoto));
        this.loading.set(false);
      },
    });
  }

  badgeClass(e: Estado) {
    switch (e) {
      case 'disponible':    return 'chip green';
      case 'reservada':     return 'chip amber';
      case 'mantenimiento': return 'chip gray';
      case 'retirada':      return 'chip red';
      default:              return 'chip';
    }
  }

  editar(m: AdminMotoVM)   { this.router.navigateByUrl(`/admin/motos/editar/${m.slug}`); }
  reservar(m: AdminMotoVM) { this.router.navigateByUrl(`/admin/reservas/nueva?moto=${m.slug}`); }

  onSearchInput(ev: Event)       { this.search.set((ev.target as HTMLInputElement).value); }
  onEstadoChange(value: string)  { this.estado.set(value as Estado | 'todos'); }
  onLibresToggle(chk: boolean)   { this.libresAhora.set(chk); }
  applyFilters()                 { this.load(); }

  // eliminar
  askDelete(m: AdminMotoVM) {
    this.toDelete.set(m);
    this.deleteError.set(null);
    this.hardDelete.set(false);
  }
  cancelDelete() {
    if (!this.deleting()) this.toDelete.set(null);
  }
  confirmDelete() {
    const m = this.toDelete();
    if (!m) return;
    this.deleting.set(true);
    this.deleteError.set(null);

    const req$ = this.hardDelete()
      ? this.api.removeHard(m.id)
      : this.api.remove(m.id);

    req$.subscribe({
      next: () => {
        this.deleting.set(false);
        this.toDelete.set(null);
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.deleteError.set(err?.error?.message || 'No se pudo eliminar la moto.');
      }
    });
  }
}