import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CalendarDisponibilidad } from '../../../shared/components/calendar-disponibilidad/calendar-disponibilidad';
import { Modelo, ModeloApi } from '../../../core/modelo-api';
import { ReservaApi } from '../../../core/services/reserva-api';

@Component({
  selector: 'app-reserva',
  imports: [[CommonModule, FormsModule, RouterModule, CalendarDisponibilidad],],
  templateUrl: './reserva.html',
  styleUrl: './reserva.scss'
})
export class Reserva {
 private route = inject(ActivatedRoute);
  private modelos = inject(ModeloApi);
  private reservas = inject(ReservaApi);

  ready = signal(false);
  error = signal<string | null>(null);
  submitting = signal(false);
  ok = signal<string | null>(null); // mostramos código reserva

  modelo = signal<Modelo | null>(null);
  // rango seleccionado
  inicio = signal<string | null>(null); // YYYY-MM-DD
  fin    = signal<string | null>(null); // YYYY-MM-DD (exclusivo)

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
      error: () => { this.error.set('No se pudo cargar el modelo.'); this.ready.set(true); }
    });
  }

  onRange(r: { start: string; end: string }) {
    this.inicio.set(r.start);
    this.fin.set(r.end);
    this.ok.set(null);
    this.error.set(null);
  }

  submit() {
    this.error.set(null);
    this.ok.set(null);

    const m = this.modelo();
    if (!m) { this.error.set('Modelo no cargado.'); return; }
    if (!this.inicio() || !this.fin()) { this.error.set('Selecciona un rango de fechas.'); return; }
    if (!this.form.nombre || !this.form.email) { this.error.set('Nombre y email son obligatorios.'); return; }

    this.submitting.set(true);

    this.reservas.create({
      modelo_id: m.id,
      fecha_inicio: this.inicio()!, // YYYY-MM-DD
      fecha_fin: this.fin()!,       // YYYY-MM-DD (exclusivo)
      cliente_nombre: this.form.nombre,
      cliente_email: this.form.email,
      cliente_tel: this.form.tel || undefined,
      notas: this.form.notas || undefined
    }).subscribe({
      next: (r) => {
        this.submitting.set(false);
        this.ok.set(r.codigo || 'GENERADA');
        // opcional: reset básico (dejamos fechas tal cual por UX)
        // this.form = { nombre:'', email:'', tel:'', notas:'' };
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set('No se pudo crear la reserva.');
        console.error(err);
      }
    });
  }
}