import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  models = signal<ModelCard[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.http.get<ModelCard[]>(`${environment.apiUrl}/catalog/modelos?limit=6`)
      .subscribe({
        next: (rows) => {
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
}

