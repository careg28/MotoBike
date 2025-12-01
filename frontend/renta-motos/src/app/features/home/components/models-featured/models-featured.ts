import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
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
  imports: [RouterModule, CommonModule],
  templateUrl: './models-featured.html',
  styleUrl: './models-featured.scss'
})
export class ModelsFeatured {
  private http = inject(HttpClient);

  models = signal<ModelCard[]>([]);
  loading = signal<boolean>(true);
  error   = signal<string | null>(null);
  
  ngOnInit() {
    this.http.get<ModelCard[]>(`${environment.apiUrl}/catalog/modelos?limit=6`)
      .subscribe({
        next: (rows) => {
          // Fallback por si alguno no tiene imagen
          const withFallback = rows.map(r => ({
            ...r,
            img: r.img || '/models/placeholder.jpg'
          }));
          this.models.set(withFallback);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set('No fue posible cargar los modelos destacados.');
          this.loading.set(false);
        }
      });
  }

modelLink(m: ModelCard)   { return ['/modelos', m.slug]; }
reserveLink(m: ModelCard) { return ['/reservar', m.slug]; }
}

