import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface UserMessageDialogData {
  title: string;
  message: string;
  cancelText?: string;
  confirmText: string;
}

@Component({
  selector: 'app-user-message-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.cancelText?.trim()) {
        <button mat-button type="button" (click)="onCancel()">{{ data.cancelText }}</button>
      }
      <button mat-flat-button color="primary" type="button" (click)="onConfirm()">{{ data.confirmText }}</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMessageDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UserMessageDialogComponent, boolean>);
  readonly data = inject<UserMessageDialogData>(MAT_DIALOG_DATA);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
