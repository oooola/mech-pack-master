import { Component, Directive } from '@angular/core';

@Component({
  selector: 'ng-progress',
  template: '',
  standalone: true,
})
export class NgProgressbar {}

@Directive({
  selector: '[ngProgressRouter]',
  standalone: true,
})
export class NgProgressRouter {}
