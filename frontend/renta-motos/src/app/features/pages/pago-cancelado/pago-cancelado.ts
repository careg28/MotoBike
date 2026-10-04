import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-pago-cancelado',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './pago-cancelado.html',
  styleUrl: './pago-cancelado.scss'
})
export class PagoCancelado {}