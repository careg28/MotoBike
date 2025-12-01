import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-hero-header',
  imports: [TranslateModule,RouterModule],
  templateUrl: './hero-header.html',
  styleUrl: './hero-header.scss'
})
export class HeroHeader {

}
