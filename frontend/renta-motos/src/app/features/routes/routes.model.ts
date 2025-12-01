export interface RouteStop {
  name: string;
  // mejor usa coordenadas si puedes (más preciso que direcciones)
  lat?: number;
  lng?: number;
  address?: string; // alternativa si no tienes lat/lng aún
  note?: string;    // ej: “bar con terraza”
}

export interface MotoRoute {
  id: string;
  title: string;
  description: string;
  image: string; // /assets/rutas/ruta1.jpg (tú la añades)
  // 4 paradas exactamente como pediste
  stops: [RouteStop, RouteStop, RouteStop, RouteStop];
  tags?: string[]; // opcional: “costera”, “histórica”, etc.
}
