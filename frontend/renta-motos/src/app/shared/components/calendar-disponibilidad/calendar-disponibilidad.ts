import { CommonModule } from '@angular/common';
import {
  Component, EventEmitter, Input, Output,
  computed, inject, signal, OnChanges, SimpleChanges, OnInit
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../enviroments/enviroment';

type AvailabilityMap = Record<string, { booked: number; available: number; is_available: boolean }>;

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function toISODateLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d: Date, days: number) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + days);
  return x;
}

@Component({
  selector: 'app-calendar-disponibilidad',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './calendar-disponibilidad.html',
  styleUrl: './calendar-disponibilidad.scss'
})
export class CalendarDisponibilidad implements OnInit, OnChanges {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  @Input({ required: true }) slug!: string;

  /** si el padre incrementa esto → recargamos */
  @Input() refreshKey: number | string | null = null;

  @Output() rangeChange = new EventEmitter<{ start: string; end: string }>();

  viewDate = signal(new Date());
  daysMap  = signal<AvailabilityMap>({});
  startSel = signal<Date | null>(null);
  endSel   = signal<Date | null>(null);

  startIso = computed(() => this.startSel() ? toISODateLocal(this.startSel()!) : null);
  endIso   = computed(() => this.endSel()   ? toISODateLocal(this.endSel()!)   : null);

  loading = signal(false);
  error   = signal<string | null>(null);

  monthName = computed(() => {
    const lang = this.translate.currentLang || this.translate.defaultLang || 'es';
    return this.viewDate().toLocaleDateString(lang, { month: 'long', year: 'numeric' });
  });

  grid = computed(() => {
    const v = this.viewDate();
    const first = new Date(v.getFullYear(), v.getMonth(), 1);

    const startOffset = (first.getDay() + 6) % 7; // lunes
    const gridStart = addDays(first, -startOffset);

    const map = this.daysMap();
    const cells: {
      date: Date;
      iso: string;
      inMonth: boolean;
      available: boolean;
      qty: number;
    }[] = [];

    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      const iso = toISODateLocal(d);
      const av = map[iso];
      cells.push({
        date: d,
        iso,
        inMonth: d.getMonth() === v.getMonth(),
        available: !!(av && av.is_available && (av.available ?? 0) > 0),
        qty: av ? (av.available ?? 0) : 0
      });
    }

    return { cells };
  });

  ngOnInit() {
    this.loadMonth();
  }

  ngOnChanges(changes: SimpleChanges) {
    // cuando cambie el modelo o el refreshKey -> recargar
    if (changes['slug'] || changes['refreshKey']) {
      if (this.slug) {
        this.startSel.set(null);
        this.endSel.set(null);
        this.loadMonth();
      }
    }
  }

  dayAriaLabel(c: { iso: string; available: boolean }) {
    return c.available
      ? c.iso
      : `${c.iso} ${this.translate.instant('calendar.unavailableSuffix')}`;
  }

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
        this.daysMap.set({});
        this.error.set(this.translate.instant('calendar.loadError'));
        this.loading.set(false);
      }
    });
  }

  prevMonth() {
    const v = this.viewDate();
    this.viewDate.set(new Date(v.getFullYear(), v.getMonth() - 1, 1));
    this.startSel.set(null);
    this.endSel.set(null);
    this.loadMonth(); // ✅ fuerza request
  }

  nextMonth() {
    const v = this.viewDate();
    this.viewDate.set(new Date(v.getFullYear(), v.getMonth() + 1, 1));
    this.startSel.set(null);
    this.endSel.set(null);
    this.loadMonth(); // ✅ fuerza request
  }

  today() {
    const t = new Date();
    this.viewDate.set(new Date(t.getFullYear(), t.getMonth(), 1));
    this.startSel.set(null);
    this.endSel.set(null);
    this.loadMonth(); // ✅ fuerza request
  }

  pick(cell: { date: Date; iso: string; available: boolean; inMonth: boolean }) {
    if (!cell.inMonth || !cell.available) return;

    const s = this.startSel();
    const e = this.endSel();

    if (s && e) {
      this.startSel.set(cell.date);
      this.endSel.set(null);
      return;
    }

    if (!s) {
      this.startSel.set(cell.date);
      return;
    }

    if (cell.date <= s) {
      this.startSel.set(cell.date);
      this.endSel.set(null);
      return;
    }

    // validar rango completo [s, cell)
    let ok = true;
    let d = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const map = this.daysMap();

    while (d < cell.date) {
      const iso = toISODateLocal(d);
      const av = map[iso];
      if (!av || !av.is_available || (av.available ?? 0) <= 0) { ok = false; break; }
      d = addDays(d, 1);
    }
    if (!ok) return;

    this.endSel.set(cell.date);
    this.rangeChange.emit({
      start: toISODateLocal(s),
      end: toISODateLocal(cell.date),
    });
  }

  isStart(iso: string) { return !!this.startIso() && iso === this.startIso(); }
  isEnd(iso: string)   { return !!this.endIso()   && iso === this.endIso(); }
  inRange(iso: string) {
    const a = this.startIso(); const b = this.endIso();
    if (!a || !b) return false;
    return iso > a && iso < b;
  }

  trackByIso = (_: number, c: any) => c.iso;
}
