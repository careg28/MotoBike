import { MotoRoute } from "./routes.model";

export const ROUTES_DATA: MotoRoute[] = [
  {
    id: 'ruta-1-costera',
    title: 'Ruta Costera: Puerto → Faro → Concha → Sicilia',
    description: 'Paseo junto al mar con parada para café y vistas al faro.',
    image: '/rutas/concha.jpeg',
    stops: [
      { name: 'Muelle / Marina de Valencia', address: 'Marina de València' },
      { name: 'Faro (zona portuaria)', address: 'Faro del puerto de Valencia' },
      { name: 'Playa La Concha (ejemplo)', address: 'Playa de la Malvarrosa, Valencia' }, // ajusta a tu “Concha”
      { name: 'Restaurante Sicilia', address: 'Ristorante Sicilia, Valencia' },
    ],
    tags: ['Costa', 'Relax']
  },
  {
    id: 'ruta-2-centro',
    title: 'Centro histórico: Serranos → Plaza Virgen → Micalet → Tapas',
    description: 'Ruta urbana por el casco antiguo con pincho final.',
    image: '/rutas/plaza-la-virgen.jpg',
    stops: [
      { name: 'Torres de Serranos', address: 'Torres de Serranos, Valencia' },
      { name: 'Plaza de la Virgen', address: 'Plaça de la Verge, Valencia' },
      { name: 'El Micalet', address: 'Micalet, Valencia' },
      { name: 'Bar de tapas', address: 'Calle Caballeros, Valencia' },
    ],
    tags: ['Histórica', 'Urbana']
  },
  {
    id: 'ruta-3-verde',
    title: 'Jardín del Turia: Puentes y parques',
    description: 'Verde, fresco y perfecto para fotos al atardecer.',
    image: '/rutas/jardin-turia.jpg',
    stops: [
      { name: 'Puente de la Exposición', address: 'Puente de la Exposición, Valencia' },
      { name: 'Gulliver', address: 'Parque Gulliver, Valencia' },
      { name: 'Palau de la Música', address: 'Palau de la Música, Valencia' },
      { name: 'Cafetería con terraza', address: 'Alameda, Valencia' },
    ],
    tags: ['Parques', 'Fácil']
  },
  {
    id: 'ruta-4-arte-ciencia',
    title: 'Arte y Ciencia: CAC → Umbracle → Hemisfèric → Aqua',
    description: 'Arquitectura icónica y plan de shopping.',
    image: '/rutas/umbracle.jpg',
    stops: [
      { name: 'Museu de les Ciències', address: 'Museu de les Ciències, Valencia' },
      { name: 'Umbracle', address: 'Umbracle, Valencia' },
      { name: 'Hemisfèric', address: 'Hemisfèric, Valencia' },
      { name: 'Centro Comercial Aqua', address: 'C.C. Aqua, Valencia' },
    ],
    tags: ['Moderna', 'Arquitectura']
  },
];
