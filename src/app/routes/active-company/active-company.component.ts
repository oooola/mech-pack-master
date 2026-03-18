import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '@shared';

@Component({
  selector: 'app-active-company',
  templateUrl: './active-company.component.html',
  styleUrl: './active-company.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [PageHeaderComponent],
})
export class ActiveCompanyComponent {
}
