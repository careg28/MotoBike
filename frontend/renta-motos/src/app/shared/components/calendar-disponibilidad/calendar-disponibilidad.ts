import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../enviroments/enviroment';

type AvailabilityMap = Record<string, { booked: number; available: number; is_available: boolean }>;

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
// YYYY-MM-DD en hora local (evita desfases de timezone)
function toISODateLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function addDays(d: Date, days: number) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + days);
  return x;
}

@Component({
  selector: 'app-calendar-disponibilidad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-disponibilidad.html',
  styleUrl: './calendar-disponibilidad.scss'
})
export class CalendarDisponibilidad {
  private http = inject(HttpClient);

  /** slug del modelo (obligatorio) */
  @Input({ required: true }) slug!: string;

  /** Emite cuando el usuario selecciona un rango válido [inicio, fin) */
  @Output() rangeChange = new EventEmitter<{ start: string; end: string }>();

  /** mes/año que se muestran */
  viewDate = signal(new Date()); // hoy

  /** mapa de disponibilidad devuelta por la API */
  daysMap = signal<AvailabilityMap>({});

  /** selección del usuario */
  startSel = signal<Date | null>(null);
  endSel   = signal<Date | null>(null);

  /** estado de carga / error */
  loading = signal(false);
  error   = signal<string | null>(null);

  /** labels */
  monthName = computed(() =>
    this.viewDate().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  /** grid de 6 semanas (42 celdas), empezando en lunes */
  grid = computed(() => {
    const v = this.viewDate();
    const first = new Date(v.getFullYear(), v.getMonth(), 1);
    const last  = new Date(v.getFullYear(), v.getMonth() + 1, 0);
    // Ajustar a lunes (0=domingo, 1=lunes...)
    const startOffset = (first.getDay() + 6) % 7; // días a retroceder hasta lunes
    const gridStart = addDays(first, -startOffset);
    const cells: { date: Date; iso: string; inMonth: boolean; available: boolean; qty: number }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      const iso = toISODateLocal(d);
      const av = this.daysMap()[iso];
      cells.push({
        date: d,
        iso,
        inMonth: d.getMonth() === v.getMonth(),
        available: av ? !!av.is_available : false,
        qty: av ? av.available : 0
      });
    }
    return { cells, first, last };
  });

  ngOnInit() {
    this.loadMonth();
    // si cambia el mes, vuelve a cargar
    effect(() => { this.viewDate(); this.loadMonth(); });
  }

  /** Carga disponibilidad del mes visible */
  private loadMonth() {
    if (!this.slug) return;
    this.loading.set(true);
    this.error.set(null);

    const v = this.viewDate();
    const from = toISODateLocal(new Date(v.getFullYear(), v.getMonth(), 1));
    const to   = toISODateLocal(new Date(v.getFullYear(), v.getMonth() + 1, 1)); // exclusivo

    this.http.get<{ days: AvailabilityMap }>(
      `${environment.apiUrl}/modelos/${this.slug}/availability`,
      { params: { from, to } }
    ).subscribe({
      next: (res: any) => {
        this.daysMap.set(res?.days || {});
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la disponibilidad.');
        this.loading.set(false);
      }
    });
  }

  prevMonth() {
    const v = this.viewDate();
    this.viewDate.set(new Date(v.getFullYear(), v.getMonth() - 1, 1));
  }
  nextMonth() {
    const v = this.viewDate();
    this.viewDate.set(new Date(v.getFullYear(), v.getMonth() + 1, 1));
  }
  today() {
    const t = new Date();
    this.viewDate.set(new Date(t.getFullYear(), t.getMonth(), 1));
  }

  /** Selección de rango: clic1 = inicio; clic2 = fin (validado) */
  pick(cell: { date: Date; iso: string; available: boolean; inMonth: boolean }) {
    if (!cell.available) return; // no seleccionar días bloqueados
    const s = this.startSel();
    const e = this.endSel();

    // si ya había rango, empezar de cero
    if (s && e) {
      this.startSel.set(cell.date);
      this.endSel.set(null);
      return;
    }

    if (!s) {
      this.startSel.set(cell.date);
      return;
    }

    // si s existe y la nueva fecha es anterior o igual, reinicia start
    if (cell.date <= s) {
      this.startSel.set(cell.date);
      this.endSel.set(null);
      return;
    }

    // validar que TODO el rango [s, cell) esté disponible
    let ok = true;
    let d = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    while (d < cell.date) {
      const iso = toISODateLocal(d);
      const av = this.daysMap()[iso];
      if (!av || !av.is_available || (av.available ?? 0) <= 0) { ok = false; break; }
      d = addDays(d, 1);
    }
    if (!ok) return;

    // rango válido
    this.endSel.set(cell.date);
    this.rangeChange.emit({
      start: toISODateLocal(s),
      end:   toISODateLocal(cell.date) // ojo: este día es el "checkout" exclusivo
    });
  }

  /** estilos de selección */
  isStart(iso: string) { const s = this.startSel(); return !!s && iso === toISODateLocal(s); }
  isEnd(iso: string)   { const e = this.endSel();   return !!e && iso === toISODateLocal(e); }
  inRange(iso: string) {
    const s = this.startSel(); const e = this.endSel();
    if (!s || !e) return false;
    const x = new Date(iso);
    return x > s && x < e;
  }

  trackByIso = (_: number, c: any) => c.iso;
}