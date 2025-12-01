import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-benefits',
  imports: [CommonModule,TranslateModule],
  templateUrl: './benefits.html',
  styleUrl: './benefits.scss'
})
export class Benefits {
  
    items: { icon: string; titleKey: string; descKey: string }[] = [
    { icon: 'fa-solid fa-clock',          titleKey: 'benefits.items.fast.title',      descKey: 'benefits.items.fast.desc' },
    { icon: 'fa-solid fa-shield-alt',     titleKey: 'benefits.items.insurance.title', descKey: 'benefits.items.insurance.desc' },
    { icon: 'fa-solid fa-motorcycle',     titleKey: 'benefits.items.fleet.title',     descKey: 'benefits.items.fleet.desc' },
    { icon: 'fa-solid fa-map-marker-alt', titleKey: 'benefits.items.location.title',  descKey: 'benefits.items.location.desc' }
  ];
}