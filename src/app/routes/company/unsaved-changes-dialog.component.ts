import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Osparade ändringar</h2>
    <mat-dialog-content>
      Du har gjort ändringar som inte har sparats, vill du ignorera dessa förändringar och gå vidare?
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Avbryt</button>
      <button mat-flat-button color="primary" (click)="onConfirm()">Gå vidare</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnsavedChangesDialogComponent {
  constructor(private readonly dialogRef: MatDialogRef<UnsavedChangesDialogComponent, boolean>) {}

  onCancel() {
    this.dialogRef.close(false);
  }

  onConfirm() {
    this.dialogRef.close(true);
  }
}
