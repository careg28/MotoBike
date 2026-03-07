import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ModeloApi, Modelo } from '../../../core/modelo-api';
import { environment } from '../../../enviroments/enviroment';

@Component({
  standalone: true,
  selector: 'app-modelo-detalle',
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './modelo-detalle.html',
  styleUrl: './modelo-detalle.scss'
})
export class ModeloDetalle {
  private route = inject(ActivatedRoute);
  private api = inject(ModeloApi);
  private translate = inject(TranslateService);

  modelo = signal<Modelo | null>(null);
  ready = signal(false);
  err = signal<string | null>(null);

  // imagen seleccionada (índice de la galería)
  selIdx = signal(0);

  // Nombre de marketing: "Marca Nombre"
  nombreLargo = computed(() => {
    const m = this.modelo();
    if (!m) return '';
    return [m.marca, m.nombre].filter(Boolean).join(' ');
  });

  // Galería (mapeando a URLs absolutas)
  gallery = computed<string[]>(() => {
    const m = this.modelo();
    if (!m) return [];
    const arr = (m.imagenes ?? []).map((p) => this.toImgUrl(p)).filter(Boolean) as string[];
    return arr.length ? arr : ['/models/placeholder.jpg'];
  });

  mainImg = computed(() => this.gallery()[this.selIdx()] ?? this.gallery()[0] ?? null);

  // ✅ Mapeo EXACTO de keys que vienen en specs (según tu JSON real)
  private SPEC_KEY_MAP: Record<string, string> = {
    baul: 'modelSpecs.topCase',
    peso: 'modelSpecs.weight',
    motor: 'modelSpecs.motor',
    frenos: 'modelSpecs.brakes',
    asiento: 'modelSpecs.seats',
    consumo: 'modelSpecs.consumption',
    deposito: 'modelSpecs.tank',
    velocidad: 'modelSpecs.speed'
  };

  // ✅ Traduce la etiqueta de la spec
  specLabel(key: string): string {
    const norm = (key || '').toString().trim().toLowerCase();
    const i18nKey = this.SPEC_KEY_MAP[norm];

    // fallback por si llega alguna clave nueva no mapeada
    if (!i18nKey) {
      return norm.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    return this.translate.instant(i18nKey);
  }

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.api.get(slug).subscribe({
      next: (m) => {
        this.modelo.set(m);
        this.ready.set(true);
      },
      error: () => {
        this.err.set(this.translate.instant('modelDetail.loadError'));
        this.ready.set(true);
      }
    });
  }

  // Construye URL pública para imágenes del backend:
  // - si viene ya con http/https o empieza por '/', la usamos tal cual
  // - si es una ruta tipo 'uploads/xxx.jpg', la resolvemos bajo el host del API en /storage/
  private toImgUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('/')) return path;

    let origin: string;
    try {
      origin = new URL(environment.apiUrl).origin;
    } catch {
      origin = '';
    }
    return `${origin}/storage/${path}`;
  }

  selectImg(i: number) {
    this.selIdx.set(i);
  }

  // Links de acción
  reservarLink() {
    const m = this.modelo();
    return m ? ['/reservar', m.slug] : ['/contacto'];
  }

  whatsappHref() {
    const msg = this.translate.instant('modelDetail.whatsappMessage', {
      name: this.nombreLargo() || ''
    });
    return `https://wa.me/34XXXXXXXXX?text=${encodeURIComponent(msg)}`;
  }

  trackUrl = (_: number, url: string) => url;
}
