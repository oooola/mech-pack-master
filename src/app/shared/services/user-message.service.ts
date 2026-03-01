import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UserMessageDialogComponent } from '@shared/components/user-message-dialog/user-message-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class UserMessageService {
  private readonly dialog = inject(MatDialog);

  async messageBox(
    title: string,
    message: string,
    cancelText: string,
    confirmText: string,
  ): Promise<boolean> {
    const dialogRef = this.dialog.open(UserMessageDialogComponent, {
      width: '420px',
      disableClose: false,
      autoFocus: false,
      restoreFocus: true,
      data: { title, message, cancelText, confirmText },
    });

    return await new Promise<boolean>(resolve => {
      dialogRef.afterClosed().subscribe(result => resolve(result === true));
    });
  }
}
