import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../enviroments/enviroment';

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
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './models.html',
  styleUrl: './models.scss'
})
export class Models {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  models = signal<ModelCard[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.http.get<ModelCard[]>(`${environment.apiUrl}/catalog/modelos`, { params: { limit: 48 } })
      .subscribe({
        next: (rows) => {
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
}
