import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../enviroments/enviroment';
import { Paginated } from '../models/paginated.type';
import { Modelo } from '../models/modelo.model';

@Injectable({ providedIn: 'root' })
export class Modelos {
  private base = `${environment.apiUrl}/modelos`;

  constructor(private http: HttpClient) {}

  list(params: { search?: string; page?: number; per_page?: number | 'all' } = {}) {
    const httpParams = new HttpParams({ fromObject: {
      ...(params.search ? { search: params.search } : {}),
      ...(params.page ? { page: String(params.page) } : {}),
      ...(params.per_page ? { per_page: String(params.per_page) } : {}),
    }});
    return this.http.get<Paginated<Modelo>>(this.base, { params: httpParams });
  }

  getBySlug(slug: string) {
    return this.http.get<Modelo>(`${this.base}/${slug}`, {  });
  }
}
