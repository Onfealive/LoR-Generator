import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DatabaseService } from './shared/database.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'lor-generator';

  constructor(
    private databaseService: DatabaseService,
  ) {

  }

  ngAfterViewInit() {
    this.databaseService.setCopyToast();
  }
}
