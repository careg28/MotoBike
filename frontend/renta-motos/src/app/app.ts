import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MetaPixelService } from './core/meta-pixel.service';

@Component({
  selector: 'app-root',
  imports: [RouterModule, TranslateModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
 constructor(private t: TranslateService, private metaPixel: MetaPixelService) {
    this.t.setDefaultLang('es');
    const saved = localStorage.getItem('lang');
    const lang = (saved && ['es','en','de'].includes(saved)) ? saved : 'es';
    this.t.use(lang);                 // 👈 esto dispara la carga de /i18n/<lang>.json
    document.documentElement.lang = lang;
    this.metaPixel.startTracking();
  }
}
