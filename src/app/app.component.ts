import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: false,
  template: '<router-outlet></router-outlet>',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'inventory-system';
}
