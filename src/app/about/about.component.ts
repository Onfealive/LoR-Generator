import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

  latestVersion = '';
  changeLogs = [];

  constructor(
    private http: HttpClient
  ) {
    this.getChangeLogJSON().subscribe((json) => {
      this.changeLogs = json;
      
      this.latestVersion = 'v' + json[0].version;
    });
  }

  ngOnInit(): void {
  }

  getHeadingID(version: string) {
    return 'heading' + version.replace('.', '_');
  }

  getChangeLogJSON(): Observable<any> {
    return this.http.get(`./assets/json/changeLogs.json`);
  }
}
