import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-loader.html',
  styleUrl: './ui-loader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiLoader {
  @Input() message = 'Cargando...';
  @Input() compact = false;
}
