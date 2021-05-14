import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import * as Utiliy from "../shared/utility";
import { DatabaseService } from '../shared/database.service';

import $ from "jquery";
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
    private databaseService: DatabaseService,
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

    this.files.push(...draggedFiles);

    let database = {};
    let countFiles = 0;

    this.files.forEach(file => {
      let currentFile = file.name.replace('.json', '').split('_');

      const selectedFile = file;
      const fileReader = new FileReader();
      fileReader.readAsText(selectedFile, "UTF-8");
      fileReader.onload = () => {
        try {
          if (!database[currentFile[0]]) {
            database[currentFile[0]] = {};
          }
          database[currentFile[0]][currentFile[1]] = fileReader.result as string;

          countFiles += 1;
          if (countFiles == this.files.length) {
            if ($.isEmptyObject(database)) {
              throw 'Empty Object';
            }
            this.database = this.databaseService._convertData2Database(database, currentFile[1]);
          }
        } catch (error) {
          console.log(error);
          this.error = 'The file contains no data, or is not formatted in Riot. Please refer to the "Utility" tab.';
        }
      }
      fileReader.onerror = (error) => {
        console.log(error);
        this.error = 'The file contains no data, or is not formatted in Riot. Please refer to the "Utility" tab.';
      }
    });
  }

  executeText() {
    this.textContent = this.textContent.replace(/(^[ \t]*\n)/gm, "");
    this.textContent = this.textContent.split('’').join("'");
    $(this.textElement.nativeElement).scrollTop(0);

    // Handling
    let database = this.database;

    // Sort for Patch Note
    const sortRules = ['name'];
    database = Utiliy.sortObjectByValues(database, sortRules, false);

    let replaceCards = [];
    Object.keys(database).sort((a, b) => {
      return database[b].name.length - database[a].name.length;
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

    this.text2Clipboard();

    $('.alert').addClass('show');
    setTimeout(() => {
      $('.alert').removeClass('show');
    }, 1500);
  }

  clearText() {
    this.textContent = '';
  }

  text2Clipboard() {
    this.databaseService.copy2Clipboard(this.textContent);
  }
}
