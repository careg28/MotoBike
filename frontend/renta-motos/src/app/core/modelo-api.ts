import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../enviroments/enviroment'; 

export interface Modelo {
  id: number;
  slug: string;
  marca: string;
  nombre: string; // p.ej. "PCX 125"
  categoria: 'scooter'|'125cc'|'250cc'|'moto';
  precio_base: number;
  deposito_sugerido?: number | null;
  specs?: Record<string, string | null>;
  badges?: string[];
  imagenes?: string[];
  descripcion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ModeloApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/modelos`;

  /** Lista todos (per_page=all) con búsqueda opcional */
  list(search = '') {
    const params = new HttpParams({ fromObject: { per_page: 'all', search } as any });
    return this.http.get<Modelo[]>(this.base, { params });
  }

  /** Si prefieres paginado, usa este */
  listPaged(opts: { search?: string; per_page?: number } = {}) {
    let params = new HttpParams();
    Object.entries({ per_page: 20, ...opts }).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<{ data: Modelo[]; current_page: number; last_page: number }>(this.base, { params });
  }

  get(slug: string) {
    return this.http.get<Modelo>(`${this.base}/${slug}`);
  }

  create(body: Partial<Modelo>) {
    return this.http.post<Modelo>(this.base, body);
  }

  update(id: number, body: Partial<Modelo>) {
    return this.http.put<Modelo>(`${this.base}/${id}`, body);
  }

  remove(id: number) {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`);
  }
}