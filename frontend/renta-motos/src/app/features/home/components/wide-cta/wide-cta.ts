import { Component, EventEmitter, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-wide-cta',
  imports: [TranslateModule,RouterModule],
  templateUrl: './wide-cta.html',
  styleUrl: './wide-cta.scss'
})
export class WideCta {
  @Output() reserveClicked = new EventEmitter<void>();
  onReserve() { this.reserveClicked.emit(); }
}
