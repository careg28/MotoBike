import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ModeloApi, Modelo } from '../../../core/modelo-api'; // ajusta la ruta si difiere
import { environment } from '../../../enviroments/enviroment';

@Component({
  standalone: true,
  selector: 'app-modelo-detalle',
  imports: [CommonModule, RouterModule],
  templateUrl: './modelo-detalle.html',
  styleUrl: './modelo-detalle.scss'
})
export class ModeloDetalle {
  private route = inject(ActivatedRoute);
  private api   = inject(ModeloApi);
  
  modelo = signal<Modelo | null>(null);
  ready  = signal(false);
  err    = signal<string | null>(null);

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
    // si no hay, placeholder
    return arr.length ? arr : ['/models/placeholder.jpg'];
  });

  mainImg = computed(() => this.gallery()[this.selIdx()] ?? this.gallery()[0] ?? null);

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.api.get(slug).subscribe({
      next: (m) => { this.modelo.set(m); this.ready.set(true); },
      error: () => { this.err.set('No se pudo cargar el modelo.'); this.ready.set(true); }
    });
  }

  // Construye URL pública para imágenes del backend:
  // - si viene ya con http/https o empieza por '/', la usamos tal cual
  // - si es una ruta tipo 'uploads/xxx.jpg', la resolvemos bajo el host del API en /storage/
  private toImgUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('/')) return path;
    // origen del backend a partir de apiUrl
    // ej: http://backend-feos.test/api  -> origin http://backend-feos.test
    let origin: string;
    try {
      origin = new URL(environment.apiUrl).origin;
    } catch {
      origin = '';
    }
    return `${origin}/storage/${path}`;
  }

  selectImg(i: number) { this.selIdx.set(i); }

  // Links de acción
  reservarLink() {
    const m = this.modelo();
    return m ? ['/reservar', m.slug] : ['/contacto'];
  }
  whatsappHref() {
    const name = encodeURIComponent(this.nombreLargo() || '');
    return `https://wa.me/34XXXXXXXXX?text=Quiero%20información%20sobre%20${name}`;
  }

  trackUrl = (_: number, url: string) => url;
}