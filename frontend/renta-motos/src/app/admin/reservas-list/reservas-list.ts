import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservaApi, type Paginated, type Reserva, type ReservaEstado } from '../../core/services/reserva-api';
import { UiLoader } from '../../shared/components/ui-loader/ui-loader';

type FreeMoto = { id: number; slug: string; matricula?: string | null; color?: string | null; estado: string };

@Component({
  selector: 'app-reservas-list',
  standalone: true,
  imports: [CommonModule, UiLoader],
  templateUrl: './reservas-list.html',
  styleUrls: ['./reservas-list.scss'],
})
export class ReservasList {
  private api = inject(ReservaApi);
  private readonly storePickupAddress =
    'Calle del Doctor Olóriz & Avinguda Dr. Peset Aleixandre, La Saidia, 46009 Valencia';

  loading = signal(false);
  error = signal<string | null>(null);

  search = signal('');
  estado = signal<ReservaEstado | ''>('');
  page = signal(1);
  perPage = signal<number>(10);

  data = signal<Paginated<Reserva> | null>(null);
  items = signal<Reserva[]>([]);

  asignarOpen = signal<Reserva | null>(null);
  loadingAsignar = signal(false);
  asignarError = signal<string | null>(null);
  freeMotos = signal<FreeMoto[]>([]);
  selectedMotoId = signal<number | null>(null);
  assigning = signal(false);

  detalleOpen = signal<Reserva | null>(null);
  savingDetalle = signal(false);
  detalleError = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    const params: Record<string, string | number> = {
      per_page: this.perPage(),
      page: this.page(),
    };

    const q = this.search().trim();
    if (q) params['search'] = q;
    if (this.estado()) params['estado'] = this.estado();

    this.api.list(params).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.items.set(res);
          this.data.set({
            data: res,
            current_page: 1,
            last_page: 1,
            per_page: res.length,
            total: res.length,
            from: 1,
            to: res.length,
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

  goToPage(page: number) {
    const data = this.data();
    if (!data) return;

    const nextPage = Math.min(Math.max(1, page), data.last_page ?? 1);
    if (nextPage !== this.page()) {
      this.page.set(nextPage);
      this.load();
    }
  }

  prev() {
    if (this.canPrev()) this.goToPage((this.data()?.current_page ?? 1) - 1);
  }

  next() {
    if (this.canNext()) this.goToPage((this.data()?.current_page ?? 1) + 1);
  }

  trackById = (_: number, reserva: Reserva) => reserva.id;

  estadoClass(estado?: ReservaEstado) {
    switch (estado) {
      case 'paid':
      case 'assigned':
        return 'chip green';
      case 'hold':
        return 'chip amber';
      case 'canceled':
        return 'chip red';
      case 'expired':
        return 'chip gray';
      case 'pendiente':
      case 'recogida':
        return 'chip amber';
      case 'confirmada':
        return 'chip green';
      default:
        return 'chip';
    }
  }

  labelEstado(estado?: ReservaEstado) {
    switch (estado) {
      case 'hold':
        return 'En espera';
      case 'paid':
        return 'Pagada';
      case 'assigned':
        return 'Asignada';
      case 'canceled':
        return 'Cancelada';
      case 'expired':
        return 'Finalizada';
      case 'pendiente':
        return 'Pendiente';
      case 'confirmada':
        return 'Confirmada';
      case 'recogida':
        return 'Recogida';
      default:
        return estado || '-';
    }
  }

  paymentLabel(status?: string | null) {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'partial_paid':
        return 'Anticipo cobrado';
      case 'paid_in_full':
        return 'Completado';
      case 'paid':
        return 'Pagado';
      default:
        return status || '-';
    }
  }

  paymentClass(status?: string | null) {
    switch (status) {
      case 'paid_in_full':
        return 'chip green';
      case 'partial_paid':
        return 'chip amber';
      case 'pending':
        return 'chip gray';
      case 'paid':
        return 'chip green';
      default:
        return 'chip gray';
    }
  }

  private pad(value: number) {
    return value < 10 ? `0${value}` : `${value}`;
  }

  fmtFecha(value: string | Date | null | undefined): string {
    if (!value) return '-';

    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      const raw = String(value);
      return raw.includes('T') ? raw.split('T')[0].split('-').reverse().join('/') : raw;
    }

    return `${this.pad(date.getDate())}/${this.pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  fmtRange(reserva: Reserva) {
    return `${this.fmtFecha(reserva.fecha_inicio)} -> ${this.fmtFecha(reserva.fecha_fin)}`;
  }

  short(text?: string | null, max = 70) {
    if (!text) return '-';
    return text.length > max ? `${text.slice(0, max - 3)}...` : text;
  }

  totalReserva(reserva: Reserva) {
    return Number(reserva.precio_total || 0);
  }

  anticipoStripe(reserva: Reserva) {
    if (reserva.payment_status === 'paid_in_full') {
      return this.totalReserva(reserva);
    }

    return Math.round(this.totalReserva(reserva) * 20) / 100;
  }

  restanteEntrega(reserva: Reserva) {
    if (reserva.payment_status === 'paid_in_full') {
      return 0;
    }

    return Math.round((this.totalReserva(reserva) - this.anticipoStripe(reserva)) * 100) / 100;
  }

  fianza(reserva: Reserva) {
    return Number(reserva.deposito || 300);
  }

  fmtMoney(value: number | string | null | undefined, moneda?: string | null) {
    const amount = Number(value || 0);
    return `${amount.toFixed(2)} ${moneda || 'EUR'}`;
  }

  entregaLabel(reserva: Reserva) {
    return reserva.tipo_entrega === 'delivery' ? 'Entrega a domicilio' : 'Recogida en tienda';
  }

  entregaDireccion(reserva: Reserva) {
    if (reserva.tipo_entrega === 'delivery') {
      const address = reserva.direccion_entrega || 'Sin direccion';
      const postal = reserva.codigo_postal ? ` (${reserva.codigo_postal})` : '';
      return `${address}${postal}`;
    }

    return this.storePickupAddress;
  }

  abrirDetalle(reserva: Reserva) {
    this.detalleOpen.set(reserva);
    this.detalleError.set(null);
  }

  cerrarDetalle() {
    if (this.savingDetalle()) return;
    this.detalleOpen.set(null);
    this.detalleError.set(null);
  }

  marcarPagoCompleto() {
    const reserva = this.detalleOpen();
    if (!reserva) return;

    this.savingDetalle.set(true);
    this.detalleError.set(null);

    this.api.update(reserva.id, {
      payment_status: 'paid_in_full',
      estado: reserva.estado === 'hold' ? 'paid' : reserva.estado,
    }).subscribe({
      next: (updated) => {
        this.savingDetalle.set(false);
        this.detalleOpen.set(updated);
        this.items.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
        this.data.update((data) => {
          if (!data) return data;
          return {
            ...data,
            data: (data.data || []).map((item) => (item.id === updated.id ? updated : item)),
          };
        });
      },
      error: (err) => {
        this.savingDetalle.set(false);
        this.detalleError.set(err?.error?.message || 'No se pudo actualizar el pago.');
      },
    });
  }

  abrirAsignar(reserva: Reserva) {
    this.asignarOpen.set(reserva);
    this.asignarError.set(null);
    this.selectedMotoId.set(null);
    this.freeMotos.set([]);
    this.loadingAsignar.set(true);

    this.api.freeMotos(reserva.id).subscribe({
      next: ({ data }) => {
        this.freeMotos.set(data || []);
        this.loadingAsignar.set(false);
      },
      error: (err) => {
        this.asignarError.set(err?.error?.message || 'No se pudieron cargar las motos libres.');
        this.loadingAsignar.set(false);
      },
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
    const reserva = this.asignarOpen();
    const motoId = this.selectedMotoId();
    if (!reserva || !motoId) return;

    this.assigning.set(true);
    this.asignarError.set(null);

    this.api.update(reserva.id, { estado: 'assigned', moto_id: motoId }).subscribe({
      next: () => {
        this.assigning.set(false);
        this.cerrarAsignar();
        this.load();
      },
      error: (err) => {
        this.assigning.set(false);
        this.asignarError.set(err?.error?.message || 'No se pudo asignar la moto.');
      },
    });
  }

  finalizar(reserva: Reserva) {
    if (!confirm(`Marcar la reserva ${reserva.codigo} como finalizada?`)) return;

    this.api.update(reserva.id, { estado: 'expired' }).subscribe({
      next: () => this.load(),
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudo finalizar la reserva.');
      },
    });
  }
}
