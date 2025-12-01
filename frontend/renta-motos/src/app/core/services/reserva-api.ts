import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../enviroments/enviroment';

export type ReservaEstado =
  | 'hold'        // creada a la espera (sin pago)
  | 'paid'
  | 'assigned'
  | 'canceled'
  | 'expired'
  // compatibilidad con estados legados en backend:
  | 'pendiente' | 'confirmada' | 'recogida';

export interface Reserva {
  id: number;
  codigo: string;
  modelo_id: number;
  moto_id?: number | null;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD (exclusivo)
  precio_total?: number | string | null;
  deposito?: number | string | null;
  moneda?: string | null;
  estado: ReservaEstado;
  cliente_nombre?: string | null;
  cliente_email?: string | null;
  cliente_tel?: string | null;
  notas?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateReservaPayload {
  modelo_id: number;              // obtenemos el id con ModeloApi.get(slug)
  moto_id?: number | null;        // normalmente null (asignación posterior)
  fecha_inicio: string;           // YYYY-MM-DD
  fecha_fin: string;              // YYYY-MM-DD (checkout exclusivo)
  cliente_nombre: string;
  cliente_email: string;
  cliente_tel?: string;
  notas?: string;
  // opcionales para cuando integremos cálculo/precio/pago
  precio_total?: number;
  deposito?: number;
  moneda?: string;
}

@Injectable({ providedIn: 'root' })
export class ReservaApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/reservas`;

  /** Crear reserva en estado HOLD (sin pago todavía) */
  create(body: CreateReservaPayload) {
    return this.http.post<Reserva>(this.base, body);
  }

  /** (Admin) listar reservas — lo dejamos listo para el panel */
  list(params: {
    search?: string;
    estado?: ReservaEstado | '';
    modelo_id?: number;
    per_page?: number | 'all';
  } = {}) {
    return this.http.get<{ data: Reserva[] } | Reserva[]>(this.base, { params: params as any });
  }

  /** (Admin) obtener detalle */
  get(id: number) {
    return this.http.get<Reserva>(`${this.base}/${id}`);
  }

  /** (Admin) actualizar (ej: certificar datos, cambiar estado, asignar moto) */
  update(id: number, patch: Partial<CreateReservaPayload & { estado: ReservaEstado }>) {
    return this.http.patch<Reserva>(`${this.base}/${id}`, patch);
  }

  /** (Admin) eliminar */
  remove(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}