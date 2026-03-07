import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservaApi, type Reserva, type Paginated, type ReservaEstado } from '../../core/services/reserva-api';

type FreeMoto = { id:number; slug:string; matricula?:string|null; color?:string|null; estado:string };

@Component({
  selector: 'app-reservas-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reservas-list.html',
  styleUrls: ['./reservas-list.scss'],
})
export class ReservasList {
  private api = inject(ReservaApi);

  // ===== UI =====
  loading = signal(false);
  error   = signal<string | null>(null);

  // filtros + paginación
  search  = signal('');
  estado  = signal<ReservaEstado | ''>('');
  page    = signal(1);
  perPage = signal<number>(10);

  // datos
  data   = signal<Paginated<Reserva> | null>(null);
  items  = signal<Reserva[]>([]);

  // ===== Modal Asignar =====
  asignarOpen    = signal<Reserva | null>(null);
  loadingAsignar = signal(false);
  asignarError   = signal<string | null>(null);
  freeMotos      = signal<FreeMoto[]>([]);
  selectedMotoId = signal<number | null>(null);
  assigning      = signal(false);

  ngOnInit() { this.load(); }

  // ===== Carga =====
  load() {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {
      per_page: this.perPage(),
      page: this.page(),
    };
    const q = this.search().trim();
    if (q) params.search = q;
    if (this.estado()) params.estado = this.estado();

    this.api.list(params).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.items.set(res);
          this.data.set({
            data: res, current_page: 1, last_page: 1,
            per_page: res.length, total: res.length, from: 1, to: res.length
          });
        } else {
          this.data.set(res);
          this.items.set(res.data || []);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudieron cargar las reservas.');
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
    this.page.set(1);
    this.load();
  }

  // ===== Paginación =====
  canPrev = computed(() => (this.data()?.current_page ?? 1) > 1);
  canNext = computed(() => {
    const d = this.data(); if (!d) return false;
    return (d.current_page ?? 1) < (d.last_page ?? 1);
  });

  goToPage(p: number) {
    const d = this.data(); if (!d) return;
    const last = d.last_page ?? 1;
    const np = Math.min(Math.max(1, p), last);
    if (np !== this.page()) {
      this.page.set(np);
      this.load();
    }
  }
  prev() { if (this.canPrev()) this.goToPage((this.data()?.current_page ?? 1) - 1); }
  next() { if (this.canNext()) this.goToPage((this.data()?.current_page ?? 1) + 1); }

  // ===== Helpers plantilla =====
  trackById = (_: number, r: Reserva) => r.id;

  estadoClass(e?: ReservaEstado) {
    switch (e) {
      case 'paid': case 'assigned': return 'chip green';
      case 'hold':                  return 'chip amber';
      case 'canceled':              return 'chip red';
      case 'expired':               return 'chip gray';
      // legados
      case 'pendiente': case 'recogida': return 'chip amber';
      case 'confirmada':                 return 'chip green';
      default: return 'chip';
    }
  }

  labelEstado(e?: ReservaEstado) {
    switch (e) {
      case 'hold':       return 'En espera';
      case 'paid':       return 'Pagada';
      case 'assigned':   return 'Asignada';
      case 'canceled':   return 'Cancelada';
      case 'expired':    return 'Finalizada';
      case 'pendiente':  return 'Pendiente';
      case 'confirmada': return 'Confirmada';
      case 'recogida':   return 'Recogida';
      default:           return e || '—';
    }
  }

  private pad(n: number) { return n < 10 ? '0' + n : '' + n; }
  fmtFecha(val: string | Date | null | undefined): string {
    if (!val) return '—';
    const d = (val instanceof Date) ? val : new Date(String(val));
    if (isNaN(d.getTime())) {
      const s = String(val);
      return s.includes('T') ? s.split('T')[0].split('-').reverse().join('/') : s;
    }
    return `${this.pad(d.getDate())}/${this.pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  fmtRange(r: Reserva) {
    return `${this.fmtFecha(r.fecha_inicio)} → ${this.fmtFecha(r.fecha_fin)}`;
  }
  short(text?: string | null, max = 70) {
    if (!text) return '—';
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  // ===== ASIGNAR =====
  abrirAsignar(r: Reserva) {
    this.asignarOpen.set(r);
    this.asignarError.set(null);
    this.selectedMotoId.set(null);
    this.freeMotos.set([]);
       this.loadingAsignar.set(true);

    this.api.freeMotos(r.id).subscribe({
      next: ({ data }) => {
        this.freeMotos.set(data || []);
        this.loadingAsignar.set(false);
      },
      error: (err) => {
        this.asignarError.set(err?.error?.message || 'No se pudieron cargar las motos libres.');
        this.loadingAsignar.set(false);
      }
    });
  }

  cerrarAsignar() {
    if (this.assigning()) return;
    this.asignarOpen.set(null);
    this.asignarError.set(null);
    this.freeMotos.set([]);
    this.selectedMotoId.set(null);
  }

  confirmarAsignar() {
    const r = this.asignarOpen();
    const motoId = this.selectedMotoId();
    if (!r || !motoId) return;

    this.assigning.set(true);
    this.asignarError.set(null);

    this.api.update(r.id, { estado: 'assigned', moto_id: motoId }).subscribe({
      next: () => {
        this.assigning.set(false);
        this.cerrarAsignar();
        this.load(); // refresca la tabla
      },
      error: (err) => {
        this.assigning.set(false);
        this.asignarError.set(err?.error?.message || 'No se pudo asignar la moto.');
      }
    });
  }

  // ===== FINALIZAR (no elimina; marca como 'expired') =====
  finalizar(r: Reserva) {
    if (!confirm(`¿Marcar la reserva ${r.codigo} como finalizada?`)) return;
    this.api.update(r.id, { estado: 'expired' }).subscribe({
      next: () => this.load(),
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudo finalizar la reserva.');
      }
    });
  }
}
