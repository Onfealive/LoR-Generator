import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import * as Utility from "../shared/utility";
import { DatabaseService } from '../shared/database.service';

import * as XLSX from 'xlsx';

@Component({
  selector: 'app-expedition-generator',
  templateUrl: './expedition-generator.component.html',
  styleUrls: ['./expedition-generator.component.scss']
})
export class ExpeditionGeneratorComponent implements OnInit {
  expeditionDatabase = null;
  database = {};

  constructor(
    private http: HttpClient,
    private databaseService: DatabaseService
  ) {
    this.databaseService.getCardData().subscribe((database) => {
      this.database = database;
    });
  }

  ngOnInit(): void {

  }

  ngAfterViewInit() {
    setTimeout(() => {
      var oReq = new XMLHttpRequest();
      oReq.open("GET", `./assets/others/expedition/v2.3.xlsx`, true);
      oReq.responseType = "arraybuffer";

      oReq.onload = (oEvent) => {
        var arrayBuffer = oReq.response; // Note: not oReq.responseText
        if (arrayBuffer) {
          const data = new Uint8Array(arrayBuffer);
          const arr = new Array();
          for (let i = 0; i !== data.length; ++i) { arr[i] = String.fromCharCode(data[i]); }
          const bstr = arr.join('');
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const first_sheet_name = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[first_sheet_name];
          
          const JSON_Object = XLSX.utils.sheet_to_json(worksheet, {header: "A"});

          console.log(JSON_Object)
          this.expeditionDatabase = this.handleExpeditionJSON(JSON_Object);
        }
      };
      oReq.send(null);
    }, 0);
  }

  handleExpeditionJSON(expeditionJSON) {
    let eDatabase = {};
    let headers = {};

    for (let i = 0; i <= 32; i++) {
      let rowData = expeditionJSON[i];
      if (i == 0) {
        let maxColumn = Object.keys(expeditionJSON[5]);

        for (let j = 0; j < maxColumn.length; j++) {
          let letter = this.columnIndex2Letter(j);
          if (letter != 'A') {
            if (rowData[letter]) {
              headers[letter] = Utility.capitalize(rowData[letter]);
            } else {
              let previousLetter = this.columnIndex2Letter(j - 1);
              headers[letter] = Utility.capitalize(headers[previousLetter]);
            }
          }
        }
      } else if (i >= 5) {
        Object.keys(rowData).forEach(key => {
          if (key == 'A') {
            return;
          }
          let archetype = headers[key];
          if (!archetype) {
            return;
          }

          let cards = rowData[key].split(' / ');
          cards.forEach(cardName => {

            let card = Object.values(this.database).find(c => c['name'].toLowerCase() == cardName.toLowerCase());
            let type = Utility.camelize(card ? (card['type'] + 's') : 'Unknown');

            if (!eDatabase[archetype]['cards']) {
              eDatabase[archetype]['cards'] = {};
            }

            if (!eDatabase[archetype]['cards'][type]) {
              eDatabase[archetype]['cards'][type] = [];
            }
            eDatabase[archetype]['cards'][type].push(card ? card['name'] : cardName);
          });
        });
      } else {
        let subject = '';
        Object.keys(rowData).forEach(key => {
          if (key == 'A') {
            subject = Utility.camelize(rowData[key].replace('(S)', '').replace('%', ''));
            return;
          }
          let archetype = headers[key];
          if (!archetype) {
            return;
          }

          if (!eDatabase[archetype]) {
            eDatabase[archetype] = {
              'name': archetype
            };
          }

          let subjectValue = rowData[key];
          if (eDatabase[archetype][subject] && subject == 'region') {
            subjectValue = eDatabase[archetype][subject] + ', ' + subjectValue;
          }

          eDatabase[archetype][subject] = subjectValue;
        });
      }
    }

    let expeditionDatabase = Object.values(eDatabase);

    Utility.sortArrayByValues(expeditionDatabase, 'name');

    return expeditionDatabase;
  }

  columnIndex2Letter(n) {
    var ordA = 'a'.charCodeAt(0);
    var ordZ = 'z'.charCodeAt(0);
    var len = ordZ - ordA + 1;

    var s = "";
    while (n >= 0) {
      s = String.fromCharCode(n % len + ordA) + s;
      n = Math.floor(n / len) - 1;
    }
    return s.toUpperCase();
  }

  letterToColumnIndex(letter) {
    var column = 0, length = letter.length;
    for (var i = 0; i < length; i++) {
      column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
    }
    return column;
  }

  getChangeLogJSON(): Observable<any> {
    return this.http.get(`./assets/jsons/expedition/v2.3.json`);
  }
}
