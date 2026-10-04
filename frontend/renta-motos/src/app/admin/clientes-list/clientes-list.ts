import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Paginated, Reserva, ReservaApi } from '../../core/services/reserva-api';
import { UiLoader } from '../../shared/components/ui-loader/ui-loader';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, UiLoader],
  templateUrl: './clientes-list.html',
  styleUrls: ['./clientes-list.scss'],
})
export class ClientesList {
  private api = inject(ReservaApi);

  loading = signal(false);
  error = signal<string | null>(null);
  search = signal('');
  page = signal(1);
  readonly perPage = 10;

  data = signal<Paginated<Reserva> | null>(null);
  items = signal<Reserva[]>([]);
  detalleOpen = signal<Reserva | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.api.list({
      page: this.page(),
      per_page: this.perPage,
      search: this.search().trim() || undefined,
    }).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.items.set(res);
          this.data.set({
            data: res,
            current_page: 1,
            last_page: 1,
            per_page: res.length,
            total: res.length,
            from: res.length ? 1 : 0,
            to: res.length,
          });
        } else {
          this.data.set(res);
          this.items.set(res.data || []);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudieron cargar los clientes.');
        this.loading.set(false);
      },
    });
  }

  applyFilters() {
    this.page.set(1);
    this.load();
  }

  canPrev = computed(() => (this.data()?.current_page ?? 1) > 1);
  canNext = computed(() => {
    const data = this.data();
    if (!data) return false;
    return (data.current_page ?? 1) < (data.last_page ?? 1);
  });

  prev() {
    if (this.canPrev()) {
      this.page.update((page) => page - 1);
      this.load();
    }
  }

  next() {
    if (this.canNext()) {
      this.page.update((page) => page + 1);
      this.load();
    }
  }

  trackById = (_: number, item: Reserva) => item.id;

  private pad(value: number) {
    return value < 10 ? `0${value}` : `${value}`;
  }

  fmtFecha(value: string | Date | null | undefined) {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return `${this.pad(date.getDate())}/${this.pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  estadoLabel(value?: string | null) {
    switch (value) {
      case 'hold': return 'En espera';
      case 'paid': return 'Pagada';
      case 'assigned': return 'Asignada';
      case 'canceled': return 'Cancelada';
      case 'expired': return 'Finalizada';
      default: return value || '-';
    }
  }

  motoLabel(item: Reserva) {
    return item.moto?.matricula || item.moto?.slug || 'Sin asignar';
  }

  abrirDetalle(item: Reserva) {
    this.detalleOpen.set(item);
  }

  cerrarDetalle() {
    this.detalleOpen.set(null);
  }
}
