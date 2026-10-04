import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, of, retry, tap, timeout } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { UiLoader } from '../../../shared/components/ui-loader/ui-loader';

type ModelCard = {
  id?: number;
  name: string;
  slug: string;
  img: string | null;
  tag: string;
  price: number;
  badges?: string[];
  specs?: {
    motor?: string;
    consumo?: string;
    velocidad?: string;
    deposito?: string;
    asiento?: string;
    baul?: string;
    frenos?: string;
    peso?: string;
  };
  in_stock?: boolean;
  stock_hoy?: number;
  stock_total?: number;
};

@Component({
  selector: 'app-models',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, UiLoader],
  templateUrl: './models.html',
  styleUrl: './models.scss'
})
export class Models {
  private readonly cacheKey = 'feos_catalog_modelos_cache';
  private readonly catalogUrl = `${environment.apiUrl}/catalog/modelos`;
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  models = signal<ModelCard[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.http.get<ModelCard[]>(this.catalogUrl, { params: { limit: 48 } })
      .pipe(
        timeout(8000),
        retry({ count: 2, delay: 800 }),
        tap((rows) => {
          try {
            sessionStorage.setItem(this.cacheKey, JSON.stringify(rows));
          } catch {
            // Ignore cache write issues on restricted browsers.
          }
        }),
        catchError((err) => {
          this.reportCatalogError(err);
          const cached = this.readCachedModels();
          if (cached.length) {
            return of(cached);
          }
          return of<ModelCard[] | null>(null);
        })
      )
      .subscribe({
        next: (rows) => {
          if (!rows) {
            this.error.set(this.translate.instant('modelsPage.loadError'));
            this.loading.set(false);
            return;
          }

          const mapped = rows.map(m => ({
            ...m,
            img: m.img || '/models/placeholder.jpg',
            badges: m.badges ?? [],
            specs: m.specs ?? {}
          }));

          this.models.set(mapped);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(this.translate.instant('modelsPage.loadError'));
          this.loading.set(false);
        }
      });
  }

  trackBySlug = (_: number, m: ModelCard) => m.slug;

  modelLink(m: ModelCard) { return ['/modelos', m.slug]; }
  reserveLink(m: ModelCard) { return ['/reservar', m.slug]; }

  sinStock() {
    alert(this.translate.instant('modelsPage.stockAlert'));
  }

  private readCachedModels(): ModelCard[] {
    try {
      const raw = sessionStorage.getItem(this.cacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as ModelCard[] : [];
    } catch {
      return [];
    }
  }

  private reportCatalogError(err: unknown) {
    const error = err as {
      status?: number;
      message?: string;
      url?: string | null;
      name?: string;
    };

    const payload = {
      type: 'catalog_load_failed',
      page: '/modelos',
      request_url: error?.url || this.catalogUrl,
      status: error?.status ?? 0,
      message: error?.message || error?.name || 'Unknown frontend error',
      online: typeof navigator !== 'undefined' ? navigator.onLine : null,
      language: typeof navigator !== 'undefined' ? navigator.language : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      timestamp: new Date().toISOString(),
    };

    this.http.post(`${environment.apiUrl}/front-log`, payload).subscribe({
      next: () => {},
      error: () => {},
    });
  }
}
