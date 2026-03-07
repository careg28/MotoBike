import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { CalendarDisponibilidad } from '../../../shared/components/calendar-disponibilidad/calendar-disponibilidad';
import { Modelo, ModeloApi } from '../../../core/modelo-api';
import { ReservaApi } from '../../../core/services/reserva-api';

@Component({
  selector: 'app-reserva',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalendarDisponibilidad, TranslateModule],
  templateUrl: './reserva.html',
  styleUrls: ['./reserva.scss']
})
export class Reserva {
  private route = inject(ActivatedRoute);
  private modelos = inject(ModeloApi);
  private reservas = inject(ReservaApi);
  private translate = inject(TranslateService);

  // estado UI
  ready = signal(false);
  error = signal<string | null>(null);
  submitting = signal(false);
  ok = signal<string | null>(null); // mostramos código reserva

  // para forzar recarga del calendario tras crear la reserva
  calRefresh = signal(0);

  // datos de modelo
  modelo = signal<Modelo | null>(null);

  // rango seleccionado
  inicio = signal<string | null>(null); // YYYY-MM-DD
  fin = signal<string | null>(null);    // YYYY-MM-DD (exclusivo)

  // formulario
  form = {
    nombre: '',
    email: '',
    tel: '',
    notas: ''
  };

  rangeText = computed(() => {
    const a = this.inicio(), b = this.fin();
    return (a && b) ? `${a} → ${b}` : '';
  });

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.modelos.get(slug).subscribe({
      next: (m) => { this.modelo.set(m); this.ready.set(true); },
      error: () => {
        this.error.set(this.translate.instant('reservePage.loadModelError'));
        this.ready.set(true);
      }
    });
  }

  // recibe { start, end } del <app-calendar-disponibilidad>
  onRange(r: { start: string; end: string }) {
    this.inicio.set(r.start);
    this.fin.set(r.end);
    this.ok.set(null);
    this.error.set(null);
  }

  submit() {
    if (this.submitting()) return;
    this.submitting.set(true);

    this.error.set(null);
    this.ok.set(null);

    const m = this.modelo();
    if (!m) {
      this.error.set(this.translate.instant('reservePage.errors.modelNotLoaded'));
      this.submitting.set(false);
      return;
    }

    const start = this.inicio();
    const end = this.fin();
    if (!start || !end) {
      this.error.set(this.translate.instant('reservePage.errors.selectRange'));
      this.submitting.set(false);
      return;
    }

    if (!this.form.nombre || !this.form.email) {
      this.error.set(this.translate.instant('reservePage.errors.nameEmailRequired'));
      this.submitting.set(false);
      return;
    }

    this.reservas.create({
      modelo_id: m.id,
      fecha_inicio: start,   // YYYY-MM-DD
      fecha_fin: end,        // YYYY-MM-DD (exclusivo)
      cliente_nombre: this.form.nombre,
      cliente_email: this.form.email,
      cliente_tel: this.form.tel || undefined,
      notas: this.form.notas || undefined
    }).subscribe({
      next: (r) => {
        this.ok.set(r.codigo || 'GENERADA'); // si quieres, también lo traduzco
        this.submitting.set(false);
        this.calRefresh.update(v => v + 1);
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.translate.instant('reservePage.errors.createFailed'));
        this.submitting.set(false);
        console.error(err);
      }
    });
  }
}
