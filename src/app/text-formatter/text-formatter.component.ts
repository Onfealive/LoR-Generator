import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import $ from "jquery";
import { HttpClient } from '@angular/common/http';

import * as Utiliy from "../shared/utility";
import { DatabaseService } from '../shared/database.service';

@Component({
  selector: 'app-text-formatter-generator',
  templateUrl: './text-formatter.component.html',
  styleUrls: ['./text-formatter.component.scss']
})
export class TextFormatterComponent implements OnInit {
  @ViewChild('text') textElement: ElementRef;

  title = 'Drop JSON patch files. Example: set2_1.5.json.';
  files: File[] = [];
  error = '';

  textContent = '';
  database = {};

  newestPatch = '';
  isCompleted = false;

  constructor(
    private http: HttpClient,
    private databaseService: DatabaseService
    ) {
  }

  ngOnInit(): void {
    this.newestPatch = this.databaseService.newestPatch;
    this.databaseService.getCardData().subscribe(database => {
      this.isCompleted = true;
      this.database = database;
    });
  }

  onSelect(event) {
    this.files = [];

    const draggedFiles = [...event.addedFiles];

    draggedFiles.sort((a, b) => {
      return a.name - b.name;
    });

    for (let i = 0; i <= draggedFiles.length - 2; i += 2) {
      let currentFile = draggedFiles[i].name.replace('.json', '').split('_');
      let nextFile = draggedFiles[i + 1].name.replace('.json', '').split('_');

      if (!["set1", "set2", "set3","set4"].includes(currentFile[0]) || !["set1", "set2", "set3","set4"].includes(nextFile[0])) {
        this.error = 'Only support Set 1 to 4.';
        return;
      }
    }

    this.files.push(...draggedFiles);

    let database = {};
    let countFiles = 0;

    this.files.forEach(file => {
      let currentFile = file.name.replace('.json', '').split('_');

      const selectedFile = file;
      const fileReader = new FileReader();
      fileReader.readAsText(selectedFile, "UTF-8");
      fileReader.onload = () => {
        if (!database[currentFile[0]]) {
          database[currentFile[0]] = {};
        }
        database[currentFile[0]][currentFile[1]] = fileReader.result as string;

        countFiles += 1;
        if (countFiles == this.files.length) {
          this.database = this.databaseService._convertData2Database(database, currentFile[1]);
        }
      }
      fileReader.onerror = (error) => {
        console.log(error);
      }
    });
  }

  executeText() {
    this.textContent = this.textContent.replace(/(^[ \t]*\n)/gm, "");
    $(this.textElement.nativeElement).scrollTop(0);

    // Handling
    let database = this.database;

    // Sort for Patch Note
    const sortRules = ['name'];
    database = Utiliy.sortObjectByValues(database, sortRules, false);

    let replaceCards = [];
    Object.keys(database).sort((a, b) => {
      return database[b].name.length - database[a].length;
    }).forEach(cardCode => {
      const cardData = database[cardCode];

      if (this.textContent.indexOf(cardData.name) >= 0) {
        if (replaceCards.find(cardName => cardName.indexOf(cardData.name) >= 0)) {
          return;
        }

        const isChampion = cardData.type == 'Unit' && cardData.supertype;
        replaceCards.push(cardData.name);

        let regex = new RegExp(`(?<!{{LoR\\|)\\b${cardData.name}\\b(?!}})`, "gm");
        this.textContent = this.textContent.replace(regex, isChampion ? `{{LoR|${cardData.name}}}` : `{{LoR|${cardData.name}|code=${cardData.code}}}`);
      }
    });
  }
}
