import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: (...args: any[]) => void;
  }
}

@Injectable({ providedIn: 'root' })
export class MetaPixelService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly pixelId = '1098384005779026';
  private started = false;

  startTracking() {
    if (this.started) return;
    this.started = true;

    this.injectPixelBase();
    this.track('PageView');

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.track('PageView'));
  }

  track(eventName: string, payload?: Record<string, unknown>) {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;

    if (payload) {
      window.fbq('track', eventName, payload);
      return;
    }

    window.fbq('track', eventName);
  }

  private injectPixelBase() {
    if (typeof window === 'undefined' || window.fbq) return;

    const script = this.document.createElement('script');
    script.innerHTML = [
      "!function(f,b,e,v,n,t,s)",
      "{if(f.fbq)return;n=f.fbq=function(){n.callMethod?",
      "n.callMethod.apply(n,arguments):n.queue.push(arguments)};",
      "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';",
      "n.queue=[];t=b.createElement(e);t.async=!0;",
      "t.src=v;s=b.getElementsByTagName(e)[0];",
      "s.parentNode.insertBefore(t,s)}(window, document,'script',",
      "'https://connect.facebook.net/en_US/fbevents.js');",
      `fbq('init', '${this.pixelId}');`,
    ].join('');

    this.document.head.appendChild(script);

    const noscript = this.document.createElement('noscript');
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${this.pixelId}&ev=PageView&noscript=1" alt="">`;
    this.document.body.appendChild(noscript);
  }
}
