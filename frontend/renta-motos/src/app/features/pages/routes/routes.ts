import { Component } from '@angular/core';
import { MotoRoute, RouteStop } from '../../routes/routes.model';
import { ROUTES_DATA } from '../../routes/routes.data';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-routes',
  imports: [CommonModule],
  templateUrl: './routes.html',
  styleUrl: './routes.scss'
})
export class Routes {
 routes: MotoRoute[] = ROUTES_DATA;

  // Detecta iOS (para abrir Apple Maps si procede)
  private isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  // Convierte un stop a texto "lat,lng" o "address"
  private stopToParam(s: RouteStop): string {
    if (s.lat != null && s.lng != null) return `${s.lat},${s.lng}`;
    if (s.address) return s.address;
    return s.name; // fallback
  }

  // Construye enlaces para Google Maps (web/app) o Apple Maps, con 4 paradas
  buildMapsLink(r: MotoRoute): string {
    const [s1, s2, s3, s4] = r.stops;
    const origin = encodeURIComponent(this.stopToParam(s1));
    const destination = encodeURIComponent(this.stopToParam(s4));
    const waypoints = encodeURIComponent([this.stopToParam(s2), this.stopToParam(s3)].join('|'));

    // iOS → Apple Maps
    if (this.isIOS()) {
      // Apple Maps admite waypoints concatenados con to:
      // maps://?saddr=ORIGIN&daddr=STOP2 to:STOP3 to:DEST
      const daddr = encodeURIComponent(
        `${this.stopToParam(s2)} to:${this.stopToParam(s3)} to:${this.stopToParam(s4)}`
      );
      return `maps://?saddr=${origin}&daddr=${daddr}&dirflg=d`;
    }

    // Android/desktop → Google Maps
    // Web universal Directions
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  }

  startRoute(r: MotoRoute) {
    const url = this.buildMapsLink(r);
    window.open(url, '_blank');
  }

  trackById = (_: number, it: MotoRoute) => it.id;
}

