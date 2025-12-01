import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../enviroments/enviroment'; // deja tu ruta actual

export interface Moto {
  id: number;
  slug: string;
  marca: string;
  modelo: string; // nombre del modelo (p.ej. "PCX 125")
  categoria: 'scooter'|'125cc'|'250cc'|'moto';
  precio_dia: number | string;
  estado: 'disponible'|'reservada'|'mantenimiento'|'retirada';

  // relación (opcional)
  modelo_id?: number;

  // campos de unidad
  matricula?: string | null;
  anio?: number | null;
  vin?: string | null;
  color?: string | null;
  deposito?: number | string | null;
  kilometraje?: number | null;
  ubicacion?: string | null;

  // contenido
  imagenes?: string[];
  specs?: Record<string, any>;
  badges?: string[];
  tag?: string | null;
  notas?: string | null;

  // calculado por backend
  asignada?: boolean;
}

// Al CREAR: el backend exige slug, categoria, precio_dia y matricula.
// Puedes usar modelo_id O bien marca+modelo.
export type CreateMotoPayload = {
  slug: string;
  categoria: 'scooter'|'125cc'|'250cc'|'moto';
  precio_dia: number | string;
  matricula: string;
  modelo_id?: number;
  marca?: string;
  modelo?: string;
  // opcionales
  estado?: 'disponible'|'reservada'|'mantenimiento'|'retirada';
  anio?: number | null;
  vin?: string | null;
  color?: string | null;
  deposito?: number | string | null;
  kilometraje?: number | null;
  ubicacion?: string | null;
  imagenes?: string[];
  specs?: Record<string, any>;
  badges?: string[];
  tag?: string | null;
  notas?: string | null;
};

// En UPDATE todo puede ser parcial (el backend permite “sometimes”)
export type UpdateMotoPayload = Partial<CreateMotoPayload>;

@Injectable({ providedIn: 'root' })
export class MotoApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/motos`;

  list(opts: {
    search?: string; categoria?: string; estado?: string;
    per_page?: number|'all'; libres?: boolean; inicio?: string; fin?: string;
    asignada?: boolean; with_trashed?: boolean; only_trashed?: boolean; sort?: string;
  } = {}) {
    let p = new HttpParams();
    Object.entries(opts).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    });
    // Puede devolver array directo o paginado { data: [] }
    return this.http.get<Moto[] | { data: Moto[] }>(this.base, { params: p });
  }

  /** Helper: siempre devuelve un array de motos (desempaqueta paginación si la hay) */
  listArray(opts: Parameters<MotoApi['list']>[0] = {}) {
    return this.list(opts).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? []))
    );
  }

  get(slug: string) {
    return this.http.get<Moto>(`${this.base}/${slug}`);
  }

  create(payload: CreateMotoPayload) {
    // JSON por defecto; no fuerces Content-Type
    return this.http.post<Moto>(this.base, payload);
  }

  update(id: number, payload: UpdateMotoPayload) {
    return this.http.put<Moto>(`${this.base}/${id}`, payload);
  }

  /** Soft delete → a papelera */
  remove(id: number) {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`);
  }

  /** Borrado definitivo (force delete) */
  removeHard(id: number)  {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}/force`);
  }

  /** Restaurar desde papelera (soft-deleted) */
  restore(id: number) {
    return this.http.post<Moto>(`${this.base}/${id}/restore`, {});
  }

  /** Cálculo de precio para un rango */
  precio(slug: string, inicio: string, fin: string, extras = 0, iva = true) {
    const params = new HttpParams()
      .set('inicio', inicio)
      .set('fin', fin)
      .set('extras', String(extras))
      .set('iva', String(iva));
    return this.http.get<{
      moto: { id: number; slug: string; precio_dia: number; deposito: number; },
      rango: { inicio: string; fin: string; dias: number; horas: number; },
      precio: { extras: number; subtotal: number; iva: number; total: number; deposito: number; a_pagar: number; }
    }>(`${this.base}/${slug}/precio`, { params });
  }
}