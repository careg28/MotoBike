import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../enviroments/enviroment';

export type ReservaEstado =
  | 'hold' | 'paid' | 'assigned' | 'canceled' | 'expired'
  | 'pendiente' | 'confirmada' | 'recogida';

export type TipoEntrega = 'pickup' | 'delivery';

export interface Reserva {
  id: number;
  codigo: string;
  modelo_id: number;
  moto_id?: number | null;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD (exclusivo)
  hora_recogida?: string | null;
  precio_total?: number | string | null;
  deposito?: number | string | null;
  moneda?: string | null;
  estado: ReservaEstado;

  cliente_nombre?: string | null;
  cliente_email?: string | null;
  cliente_tel?: string | null;
  cliente_documento?: string | null;
  cliente_nacionalidad?: string | null;
  cliente_direccion_origen?: string | null;
  cliente_direccion_hospedaje?: string | null;
  payment_intent_id?: string | null;
  payment_status?: string | null;
  notas?: string | null;

  tipo_entrega?: TipoEntrega | null;
  direccion_entrega?: string | null;
  codigo_postal?: string | null;
  coste_entrega?: number | string | null;

  created_at?: string;
  updated_at?: string;

  // si el backend carga relaciones:
  modelo?: { id:number; slug:string; marca:string; nombre:string } | null;
  moto?: { id:number; slug:string; matricula?:string|null } | null;
}

export interface CreateReservaPayload {
  modelo_id: number;
  moto_id?: number | null;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD (checkout exclusivo)
  hora_recogida?: string;

  cliente_nombre: string;
  cliente_email: string;
  cliente_tel: string;
  cliente_documento: string;
  cliente_nacionalidad: string;
  cliente_direccion_origen: string;
  cliente_direccion_hospedaje: string;
  notas: string;

  precio_total?: number;
  deposito?: number;
  moneda?: string;
  client_key?: string;

  tipo_entrega?: TipoEntrega;
  direccion_entrega?: string;
  codigo_postal?: string;
  coste_entrega?: number;
}

// respuesta paginada genérica
export interface Paginated<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  from?: number;
  to?: number;
}

// (opcional) tipado de la respuesta pública de lookup
export interface PublicLookupReserva {
  id: number;
  codigo: string;
  estado: ReservaEstado | string;
  fecha_inicio: string;
  fecha_fin: string;
  hora_recogida?: string | null;
  precio_total?: number | string | null;
  deposito?: number | string | null;
  moneda?: string | null;

  tipo_entrega?: TipoEntrega | null;
  direccion_entrega?: string | null;
  codigo_postal?: string | null;
  coste_entrega?: number | string | null;

  modelo?: { id:number; slug:string; marca:string; nombre:string } | null;
  puede_cancelar?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReservaApi {
  private http = inject(HttpClient);

  // admin
  private base = `${environment.apiUrl}/reservas`;

  /** Crear reserva en estado HOLD */
  create(body: CreateReservaPayload) {
    return this.http.post<Reserva>(this.base, body);
  }

  /** Stripe Checkout */
checkout(body: CreateReservaPayload) {
  return this.http.post<{
    reserva_id: number;
    codigo: string;
    checkout_url: string;
    precio_total: number;
    anticipo: number;
    restante: number;
    deposito: number;
  }>(`${this.base}/checkout`, body);
}

  /** Listar reservas (admin) */
  list(params: {
    search?: string;
    estado?: ReservaEstado | '';
    modelo_id?: number;
    per_page?: number | 'all';
    page?: number;
  } = {}) {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        httpParams = httpParams.set(k, String(v));
      }
    });
    return this.http.get<Reserva[] | Paginated<Reserva>>(this.base, { params: httpParams });
  }

  /** Detalle (admin) */
  get(id: number) {
    return this.http.get<Reserva>(`${this.base}/${id}`);
  }

  /** Actualizar (admin) */
  update(id: number, patch: Partial<CreateReservaPayload & {
    estado: ReservaEstado;
    payment_status: string;
    payment_intent_id: string | null;
  }>) {
    return this.http.patch<Reserva>(`${this.base}/${id}`, patch);
  }

  /** Eliminar (admin) */
  remove(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** Motos libres para el modal de Asignar (admin) */
  freeMotos(reservaId: number) {
    return this.http.get<{
      data: Array<{ id:number; slug:string; matricula?:string|null; color?:string|null; estado:string }>
    }>(`${this.base}/${reservaId}/motos-libres`);
  }

  // ==========================
  // público: seguimiento
  // ==========================

  /** (Público) buscar reserva por código */
  lookupPublic(codigo: string) {
    const code = encodeURIComponent((codigo || '').trim());
    return this.http.get<PublicLookupReserva>(
      `${environment.apiUrl}/public/reservas/lookup/${code}`
    );
  }

  /** (Público) cancelar reserva por código */
  cancelPublic(codigo: string) {
    const code = encodeURIComponent((codigo || '').trim());
    return this.http.post<{
      codigo: string;
      estado: ReservaEstado | string;
      fecha_inicio: string;
      fecha_fin: string;
      modelo?: { id:number; slug:string; marca:string; nombre:string } | null;
    }>(`${environment.apiUrl}/public/reservas/${code}/cancel`, {});
  }

  getStripeSessionDetails(sessionId: string) {
  return this.http.get<{
    id: number;
    codigo: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string;
    hora_recogida?: string | null;
    precio_total?: number | string | null;
    deposito?: number | string | null;
    anticipo_stripe?: number | string | null;
    restante_entrega?: number | string | null;
    fianza_entrega?: number | string | null;
    moneda?: string | null;
    tipo_entrega?: 'pickup' | 'delivery' | null;
    direccion_entrega?: string | null;
    codigo_postal?: string | null;
    coste_entrega?: number | string | null;
    cliente_nombre?: string | null;
    cliente_email?: string | null;
    cliente_tel?: string | null;
    cliente_documento?: string | null;
    cliente_nacionalidad?: string | null;
    cliente_direccion_origen?: string | null;
    cliente_direccion_hospedaje?: string | null;
    modelo?: { id:number; slug:string; marca:string; nombre:string } | null;
  }>(`${environment.apiUrl}/stripe/session/${encodeURIComponent(sessionId)}`);
}

  
}
