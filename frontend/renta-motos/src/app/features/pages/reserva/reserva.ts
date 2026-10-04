import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { CalendarDisponibilidad } from '../../../shared/components/calendar-disponibilidad/calendar-disponibilidad';
import { Modelo, ModeloApi } from '../../../core/modelo-api';
import { ReservaApi } from '../../../core/services/reserva-api';
import { Contact } from '../../home/components/contact/contact';
import { UiLoader } from '../../../shared/components/ui-loader/ui-loader';

@Component({
  selector: 'app-reserva',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalendarDisponibilidad, TranslateModule, Contact, UiLoader],
  templateUrl: './reserva.html',
  styleUrls: ['./reserva.scss']
})
export class Reserva {
  private route = inject(ActivatedRoute);
  private modelos = inject(ModeloApi);
  private reservas = inject(ReservaApi);
  private translate = inject(TranslateService);

  ready = signal(false);
  // Cambiar a false cuando se reabran las reservas públicas.
  readonly reservationsPaused = true;
  error = signal<string | null>(null);
  submitting = signal(false);
  ok = signal<string | null>(null);
  termsOpen = signal(false);
  reservationCreatedOpen = signal(false);
  reservationWhatsappUrl = signal('');

  calRefresh = signal(0);
  modelo = signal<Modelo | null>(null);

  inicio = signal<string | null>(null);
  ultimoDiaUso = signal<string | null>(null);
  fin = signal<string | null>(null);
  diasUso = signal(0);
  horaRecogida = signal('16:00');

  form = {
    nombre: '',
    email: '',
    tel: '',
    documento: '',
    nacionalidad: '',
    direccion_origen: '',
    direccion_hospedaje: '',
    notas: '',
    direccion_entrega: '',
  };

  readonly deliveryPostalCodes = [
    '46001', '46002', '46003', '46004',
    '46005', '46006', '46007', '46008',
    '46009', '46010', '46011', '46013',
    '46014', '46015', '46017', '46018',
    '46019', '46020', '46021', '46022',
    '46023', '46024', '46025', '46026',
  ];

  readonly pickupTimeOptions = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  ];

  private readonly whatsappNumber = '34624473220';
  private readonly storeAddress = 'Calle del Doctor Oloriz & Avinguda Dr. Peset Aleixandre, La Saidia, 46009 Valencia';

  tipoEntrega = signal<'pickup' | 'delivery'>('pickup');
  codigoPostal = signal('');

  rangeText = computed(() => {
    const a = this.inicio();
    const b = this.ultimoDiaUso();
    return (a && b) ? `${a} -> ${b}` : '';
  });

  returnText = computed(() => {
    const end = this.fin();
    const hour = this.horaRecogida();
    return end ? `${end} ${hour}` : '';
  });

  deliveryFee = computed(() => {
    if (this.tipoEntrega() !== 'delivery') return 0;
    return 25;
  });

  rentalDays = computed(() => this.diasUso());

  rentalSubtotal = computed(() => {
    const m = this.modelo();
    const dias = this.rentalDays();

    if (!m || dias <= 0) return 0;

    return dias * Number(m.precio_base || 0);
  });

  estimatedTotal = computed(() => this.rentalSubtotal() + this.deliveryFee());

  setTipoEntrega(value: 'pickup' | 'delivery') {
    this.tipoEntrega.set(value);
    if (value === 'pickup') {
      this.codigoPostal.set('');
      this.form.direccion_entrega = '';
    }
  }

  ngOnInit() {
    if (this.reservationsPaused) {
      this.ready.set(true);
      return;
    }
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.modelos.get(slug).subscribe({
      next: (m) => {
        this.modelo.set(m);
        this.ready.set(true);
      },
      error: () => {
        this.error.set(this.translate.instant('reservePage.loadModelError'));
        this.ready.set(true);
      }
    });
  }

  onRange(r: { start: string; end: string; returnDate: string; billableDays: number }) {
    this.inicio.set(r.start);
    this.ultimoDiaUso.set(r.end);
    this.fin.set(r.returnDate);
    this.diasUso.set(r.billableDays);
    this.ok.set(null);
    this.error.set(null);
  }

  submit() {
    if (this.reservationsPaused) return;
    if (this.submitting()) return;
    this.error.set(null);
    this.ok.set(null);

    const m = this.modelo();
    if (!m) {
      this.error.set(this.translate.instant('reservePage.errors.modelNotLoaded'));
      return;
    }

    const start = this.inicio();
    const end = this.fin();

    if (!start || !end) {
      this.error.set(this.translate.instant('reservePage.errors.selectRange'));
      return;
    }

    if (this.rentalDays() < 2) {
      this.error.set(this.translate.instant('reservation.minDays'));
      return;
    }

    if (!this.horaRecogida()) {
      this.error.set(this.translate.instant('reservation.pickupTimeRequired'));
      return;
    }

    const requiredFields = [
      this.form.nombre,
      this.form.email,
      this.form.tel,
      this.form.documento,
      this.form.nacionalidad,
      this.form.direccion_origen,
      this.form.direccion_hospedaje,
      this.form.notas,
    ];

    if (requiredFields.some((value) => !value.trim())) {
      this.error.set(this.translate.instant('reservePage.errors.allFieldsRequired'));
      return;
    }

    if (this.tipoEntrega() === 'delivery') {
      if (!this.form.direccion_entrega.trim() || !this.codigoPostal()) {
        this.error.set(this.translate.instant('reservation.deliveryAddressRequired'));
        return;
      }
    }

    this.termsOpen.set(true);
  }

  closeTerms() {
    if (this.submitting()) return;
    this.termsOpen.set(false);
  }

  confirmTerms() {
    if (this.reservationsPaused) return;
    if (this.submitting()) return;

    const m = this.modelo();
    const start = this.inicio();
    const end = this.fin();

    if (!m || !start || !end) {
      this.error.set(this.translate.instant('reservePage.errors.createFailed'));
      this.termsOpen.set(false);
      return;
    }

    this.submitting.set(true);

    this.reservas.create({
      modelo_id: m.id,
      fecha_inicio: start,
      fecha_fin: end,
      hora_recogida: this.horaRecogida(),
      cliente_nombre: this.form.nombre,
      cliente_email: this.form.email,
      cliente_tel: this.form.tel,
      cliente_documento: this.form.documento,
      cliente_nacionalidad: this.form.nacionalidad,
      cliente_direccion_origen: this.form.direccion_origen,
      cliente_direccion_hospedaje: this.form.direccion_hospedaje,
      notas: this.form.notas,
      tipo_entrega: this.tipoEntrega(),
      direccion_entrega: this.tipoEntrega() === 'delivery'
        ? this.form.direccion_entrega
        : undefined,
      codigo_postal: this.tipoEntrega() === 'delivery'
        ? this.codigoPostal()
        : undefined,
      coste_entrega: this.tipoEntrega() === 'delivery'
        ? this.deliveryFee()
        : 0,
    }).subscribe({
      next: (r) => {
        this.termsOpen.set(false);
        this.submitting.set(false);
        this.ok.set(r.codigo ?? null);

        const whatsappUrl = this.buildWhatsappUrl(r);
        if (this.shouldOpenWhatsappDirectly()) {
          window.location.href = whatsappUrl;
          return;
        }

        this.reservationWhatsappUrl.set(whatsappUrl);
        this.reservationCreatedOpen.set(true);
      },
      error: (err) => {
        this.error.set(
          err?.error?.message ||
          this.translate.instant('reservePage.errors.createFailed')
        );
        this.submitting.set(false);
        this.termsOpen.set(false);
        console.error(err);
      }
    });
  }

  closeReservationCreated() {
    this.reservationCreatedOpen.set(false);
  }

  openWhatsappReservation() {
    const url = this.reservationWhatsappUrl();
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  private shouldOpenWhatsappDirectly() {
    if (typeof window === 'undefined') return false;

    const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
    const ua = window.navigator.userAgent || '';
    const isMobileAgent = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua);

    return isSmallScreen || isMobileAgent;
  }

  private buildWhatsappUrl(reserva: {
    codigo?: string | null;
    precio_total?: number | string | null;
    moneda?: string | null;
  }) {
    const m = this.modelo();
    const usageEnd = this.ultimoDiaUso();
    const lines = [
      'Hola, quiero confirmar esta reserva web.',
      '',
      `Codigo: ${reserva.codigo ?? '-'}`,
      `Modelo: ${m ? `${m.marca} ${m.nombre}` : '-'}`,
      `Dias de uso: ${this.inicio() ?? '-'} -> ${usageEnd ?? '-'}`,
      `Hora de recogida: ${this.horaRecogida()}`,
      `Devolucion: ${this.fin() ?? '-'} ${this.horaRecogida()}`,
      `Cliente: ${this.form.nombre}`,
      `Email: ${this.form.email}`,
      `Telefono: ${this.form.tel}`,
      `Documento: ${this.form.documento}`,
      `Nacionalidad: ${this.form.nacionalidad}`,
      `Direccion origen: ${this.form.direccion_origen}`,
      `Direccion hospedaje: ${this.form.direccion_hospedaje}`,
      `Entrega: ${this.tipoEntrega() === 'delivery' ? 'A domicilio' : 'Recogida en tienda'}`,
    ];

    if (this.tipoEntrega() === 'delivery') {
      lines.push(`Direccion entrega: ${this.form.direccion_entrega}`);
      lines.push(`Codigo postal: ${this.codigoPostal()}`);
      lines.push(`Coste entrega: ${this.deliveryFee().toFixed(2)} EUR`);
    } else {
      lines.push(`Direccion recogida: ${this.storeAddress}`);
    }

    lines.push(`Importe estimado: ${Number(reserva.precio_total ?? this.estimatedTotal()).toFixed(2)} ${reserva.moneda ?? 'EUR'}`);
    lines.push('Notas: ' + this.form.notas);

    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
  }
}
