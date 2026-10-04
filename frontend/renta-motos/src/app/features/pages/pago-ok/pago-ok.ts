import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ReservaApi } from '../../../core/services/reserva-api';
import { UiLoader } from '../../../shared/components/ui-loader/ui-loader';

@Component({
  selector: 'app-pago-ok',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, UiLoader],
  templateUrl: './pago-ok.html',
  styleUrl: './pago-ok.scss'
})
export class PagoOk {
  private route = inject(ActivatedRoute);
  private reservas = inject(ReservaApi);

  loading = signal(true);
  error = signal<string | null>(null);
  reserva = signal<any | null>(null);

  private pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

  fmtFecha(value: string | null | undefined): string {
    if (!value) return '-';
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return `${this.pad(d.getDate())}/${this.pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  ultimoDiaUso(value: string | null | undefined): string {
    if (!value) return '-';
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    d.setDate(d.getDate() - 1);
    return `${this.pad(d.getDate())}/${this.pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  ngOnInit() {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');

    if (!sessionId) {
      this.error.set('No se encontró la sesión de pago.');
      this.loading.set(false);
      return;
    }

    this.reservas.getStripeSessionDetails(sessionId).subscribe({
      next: (data) => {
        this.reserva.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudo cargar la reserva.');
        this.loading.set(false);
      }
    });
  }
}
