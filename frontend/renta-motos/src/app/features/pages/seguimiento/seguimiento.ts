import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReservaApi } from '../../../core/services/reserva-api';

type LookupReserva = {
  id: number;
  codigo: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  hora_recogida?: string | null;
  precio_total?: number | string | null;
  deposito?: number | string | null;
  moneda?: string | null;
  modelo?: { id:number; slug:string; marca:string; nombre:string } | null;
  moto?: { id:number; slug:string; matricula?:string|null } | null;
  puede_cancelar?: boolean;
};

@Component({
  selector: 'app-seguimiento-reserva',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './seguimiento.html',
  styleUrls: ['./seguimiento.scss'],
})
export class SeguimientoReserva {
  private api = inject(ReservaApi);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);

  code = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);
  reserva = signal<LookupReserva | null>(null);

  estadoLabel = computed(() => {
    const r = this.reserva();
    if (!r) return '';

    const key = `tracking.status.${r.estado}`;
    const translated = this.translate.instant(key);
    return translated === key ? r.estado : translated;
  });

  estadoClass = computed(() => {
    const r = this.reserva();
    if (!r) return 'chip gray';
    switch (r.estado) {
      case 'paid': return 'chip green';
      case 'assigned': return 'chip amber';
      case 'hold': return 'chip gray';
      case 'canceled': return 'chip red';
      case 'expired': return 'chip gray';
      default: return 'chip gray';
    }
  });

  ngOnInit() {
    const fromQuery = this.route.snapshot.queryParamMap.get('code');
    if (fromQuery) {
      this.code.set(fromQuery);
      this.buscar();
    }
  }

  buscar() {
    const c = this.code().trim().toUpperCase();
    this.code.set(c);

    if (!c) {
      this.error.set(this.translate.instant('tracking.errors.enterCode'));
      this.reserva.set(null);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.reserva.set(null);

    this.api.lookupPublic(c).subscribe({
      next: (r) => {
        this.reserva.set(r as LookupReserva);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || this.translate.instant('tracking.errors.notFound'));
      }
    });
  }

  private pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

  fmtFecha(val: string | null | undefined): string {
    if (!val) return '-';
    const d = new Date(String(val));
    if (Number.isNaN(d.getTime())) {
      const s = String(val);
      return s.includes('T') ? s.split('T')[0].split('-').reverse().join('/') : s;
    }
    return `${this.pad(d.getDate())}/${this.pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  ultimoDiaUso(val: string | null | undefined): string {
    if (!val) return '-';
    const d = new Date(String(val));
    if (Number.isNaN(d.getTime())) {
      return String(val);
    }
    d.setDate(d.getDate() - 1);
    return `${this.pad(d.getDate())}/${this.pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
}
