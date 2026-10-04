import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, of, retry, tap, timeout } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';

type ModelCard = {
  name: string;
  slug: string;
  img: string | null;
  tag: string;
  price: number;
};

@Component({
  selector: 'app-models-featured',
  imports: [RouterModule, CommonModule, TranslateModule],
  templateUrl: './models-featured.html',
  styleUrl: './models-featured.scss'
})
export class ModelsFeatured {
  private readonly cacheKey = 'feos_featured_modelos_cache';
  private readonly featuredUrl = `${environment.apiUrl}/catalog/modelos?limit=6`;
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  models = signal<ModelCard[]>([]);
  displayModels = computed(() => {
    const rows = this.models();

    if (rows.length === 0) {
      return [];
    }

    if (rows.length >= 3) {
      return rows.slice(0, 3);
    }

    const repeated: ModelCard[] = [];
    for (let i = 0; i < 3; i++) {
      repeated.push(rows[i % rows.length]);
    }

    return repeated;
  });
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.http.get<ModelCard[]>(this.featuredUrl)
      .pipe(
        timeout(8000),
        retry({ count: 2, delay: 800 }),
        tap((rows) => {
          try {
            localStorage.setItem(this.cacheKey, JSON.stringify(rows));
          } catch {
            // Ignore cache write issues.
          }
        }),
        catchError((err) => {
          this.reportFeaturedError(err);
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
            this.error.set(this.translate.instant('modelsFeatured.loadError'));
            this.loading.set(false);
            return;
          }

          const withFallback = rows.map(r => ({
            ...r,
            img: r.img || '/models/placeholder.jpg'
          }));
          this.models.set(withFallback);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(this.translate.instant('modelsFeatured.loadError'));
          this.loading.set(false);
        }
      });
  }

  modelLink(m: ModelCard) { return ['/modelos', m.slug]; }
  reserveLink(m: ModelCard) { return ['/reservar', m.slug]; }
  trackByCard(index: number, m: ModelCard) { return `${m.slug}-${index}`; }

  private readCachedModels(): ModelCard[] {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as ModelCard[] : [];
    } catch {
      return [];
    }
  }

  private reportFeaturedError(err: unknown) {
    const error = err as {
      status?: number;
      message?: string;
      url?: string | null;
      name?: string;
    };

    const payload = {
      type: 'featured_models_load_failed',
      page: '/',
      request_url: error?.url || this.featuredUrl,
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

