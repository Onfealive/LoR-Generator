import { Component, OnInit } from '@angular/core';
import * as Diff from "diff";
import * as Utiliy from "../shared/utility";
import { HttpClient } from '@angular/common/http';
import { saveAs } from 'file-saver';
import { PatchInfo } from '../shared/patches';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

declare var $: any;

@Component({
  selector: 'app-patch-notes-generator',
  templateUrl: './patch-notes-generator.component.html',
  styleUrls: ['./patch-notes-generator.component.scss']
})
export class PatchNotesGeneratorComponent implements OnInit {
  title = 'Drop JSON patch files, with format: "<Set Name>_<Patch Name>.json". Example: set2_1.6.json.';
  files: File[] = [];
  error = '';

  resourceImageFolder = '';
  setContents = {};
  cardChanged = [];
  cardAdded = [];

  patchIDs = {
    old: '',
    new: ''
  }

  database = {};

  isCompleted = false;

  patchInfo = [];

  constructor(
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    let patchLength = Object.keys(PatchInfo).length;
    Object.keys(PatchInfo).forEach((patchVersion, index) => {
      this.patchInfo.push({
        'name': patchVersion,
        'code': PatchInfo[patchVersion].code,
        'checked': index == patchLength - 1,
        'maxSet': PatchInfo[patchVersion].maxSet
      })
    })
  }

  selectPatchInfo(pathcInfo) {
    this.patchInfo.find(p => p.checked).checked = false;
    pathcInfo.checked = true;
    this.isCompleted = false;
  }

  compare() {
    this.setContents = {};
    let selectedPatchIndex = this.patchInfo.findIndex(p => p.checked);

    let selectedPatch = this.patchInfo[selectedPatchIndex].name;
    let previousPatch = this.patchInfo[selectedPatchIndex - 1].name;

    this.patchIDs.old = previousPatch;
    this.patchIDs.new = selectedPatch;

    let maxSet = this.patchInfo[selectedPatchIndex].maxSet;
    let countFiles = 0;
    for (let i = 1; i <= maxSet; i++) {
      this.getJSON(selectedPatch, i).subscribe(data => {

        if (!this.setContents['set' + i]) {
          this.setContents['set' + i] = {};
        }

        this.setContents['set' + i][selectedPatch] = JSON.stringify(data || []);

        countFiles += 1;
        if (countFiles == maxSet * 2) {
          this.compareJson();
        }
      });
      this.getJSON(previousPatch, i).subscribe(data => {
        if (!this.setContents['set' + i]) {
          this.setContents['set' + i] = {};
        }

        this.setContents['set' + i][previousPatch] = JSON.stringify(data || []);

        countFiles += 1;
        if (countFiles == maxSet * 2) {
          this.compareJson();
        }
      }, (error) => {
        if (!this.setContents['set' + i]) {
          this.setContents['set' + i] = {};
        }

        this.setContents['set' + i][previousPatch] = JSON.stringify([]);

        countFiles += 1;
        if (countFiles == maxSet * 2) {
          this.compareJson();
        }
      });
    }
    // $('.hover-preview').anarchytip();
  }

  public getJSON(patch, set = 1): Observable<any> {
    return this.http.get(`./assets/json/set${set}_${patch}.json`);
  }

  getAPIImage(patchCode, cardcode) {
    let set = parseInt(cardcode.substring(0, 2));
    let url = `https://dd.b.pvp.net/${patchCode}/set${set}/en_us/img/cards/${cardcode}.png`;

    return url;
  }

  optionChanged(inputOption) {
    let options = {};
    options[inputOption] = true;
    this.compareJson(options);
  }

  onSelect(event) {
    this.error = '';
    this.isCompleted = false;
    this.files = [];

    const draggedFiles = [...event.addedFiles];
    if (draggedFiles.length % 2 !== 0) {
      this.error = 'The files must include a pair with an old file and a new file.'
      return;
    }
    draggedFiles.sort((a, b) => {
      return a.name - b.name;
    });
    for (let i = 0; i <= draggedFiles.length - 2; i += 2) {
      let currentFile = draggedFiles[i].name.replace('.json', '').split('_');
      let nextFile = draggedFiles[i + 1].name.replace('.json', '').split('_');

      if (currentFile[1] == nextFile[1]) {
        this.error = 'The files must include a pair with an old file and a new file, of the same Set, different Patch.';
        return;
      } else if (!["set1", "set2", "set3"].includes(currentFile[0]) || !["set1", "set2", "set3"].includes(nextFile[0])) {
        this.error = 'Only support Set 1 to 3.';
        return;
      }

      this.patchIDs.old = currentFile[1];
      this.patchIDs.new = nextFile[1];
    }

    this.files.push(...draggedFiles);

    let countFiles = 0;
    this.files.forEach(file => {
      let currentFile = file.name.replace('.json', '').split('_');

      const selectedFile = file;
      const fileReader = new FileReader();
      fileReader.readAsText(selectedFile, "UTF-8");
      fileReader.onload = () => {
        if (!this.setContents[currentFile[0]]) {
          this.setContents[currentFile[0]] = {};
        }
        this.setContents[currentFile[0]][currentFile[1]] = fileReader.result as string;

        countFiles += 1;
        if (countFiles == this.files.length) {
          this.compareJson();
        }
      }
      fileReader.onerror = (error) => {
        console.log(error);
      }
    });
  }

  onRemove(event) {
    this.files.splice(this.files.indexOf(event), 1);
  }

  compareJson(options: any = { display: true }) {
    this.isCompleted = true;

    setTimeout(() => {
      // Init
      const defaults = {
        display: false,
        patchNote: false,
        newChangeLog: false,
        oldChangeLog: false
      };

      options = Object.assign({}, defaults, options);

      this.cardChanged = [];
      this.cardAdded = [];
      const display = document.getElementById('display'),
        displayFragment = document.createDocumentFragment();

      display.innerHTML = '';
      // Handleing
      let totalOldJSONData = {};
      let totalNewJSONData = {};

      const getCardType = (cardData) => {
        if (cardData.type == 'Unit') {
          if (cardData.supertype) {
            return 'Champion';
          }

          return 'Follower';
        }

        return cardData.type;
      }
      Object.keys(this.setContents).forEach(setID => {
        // Old Set
        const oldData = this.setContents[setID][this.patchIDs.old];
        let oldDataJSON = {};
        JSON.parse(oldData).forEach(cardData => {
          oldDataJSON[cardData.cardCode] = {
            _data: cardData,
            code: cardData.cardCode,
            name: cardData.name,
            cost: cardData.cost,
            power: cardData.attack,
            health: cardData.health,
            description: cardData.descriptionRaw.split("\r\n").join(" "),
            levelupDescription: cardData.levelupDescriptionRaw.split("\r\n").join(" "),
            // type: cardData.cardCode.indexOf('T') >= 0 ? '' : getCardType(cardData)
            type: getCardType(cardData),
            spellSpeed: cardData.spellSpeed,
            group: Utiliy.capitalize(cardData.subtypes ? cardData.subtypes[0] : cardData.subtype),
            flavor: cardData.flavorText.trim().replace(/(?:\r\n|\r|\n)/g, ' '),
            keywords: cardData.keywords.filter(k => !['Slow', 'Fast', 'Burst'].includes(k)),
          }
        });

        totalOldJSONData = Object.assign(totalOldJSONData, oldDataJSON);

        // New Set
        const newData = this.setContents[setID][this.patchIDs.new];
        let newDataJSON = {};
        JSON.parse(newData).forEach(cardData => {
          newDataJSON[cardData.cardCode] = {
            _data: cardData,
            code: cardData.cardCode,
            name: cardData.name,
            cost: cardData.cost,
            power: cardData.attack,
            health: cardData.health,
            description: cardData.descriptionRaw.split("\r\n").join(" "),
            levelupDescription: cardData.levelupDescriptionRaw.split("\r\n").join(" "),
            // type: cardData.cardCode.indexOf('T') >= 0 ? '' : getCardType(cardData)
            type: getCardType(cardData),
            spellSpeed: cardData.spellSpeed,
            group: Utiliy.capitalize(cardData.subtypes ? cardData.subtypes[0] : cardData.subtype),
            flavor: cardData.flavorText.trim().replace(/(?:\r\n|\r|\n)/g, ' '),
            keywords: cardData.keywords.filter(k => !['Slow', 'Fast', 'Burst'].includes(k)),
          }
        });

        totalNewJSONData = Object.assign(totalNewJSONData, newDataJSON);
        
      });
      // // Get Type
      // totalOldJSONData = this.sortObjectByValues(totalOldJSONData, 'code');
      // totalNewJSONData = this.sortObjectByValues(totalNewJSONData, 'code');

      // Object.keys(totalOldJSONData).forEach(cardCode => {
      //   const cardData = totalOldJSONData[cardCode]
      //   if (cardData.type == '') {
      //     if (cardData.code.indexOf('T') >= 0) {
      //       // totalOldJSONData[cardCode].type =
      //       //   getCardType(totalOldJSONData[cardCode.split('T')[0]]._data)
      //       //   + '-'
      //       //   + getCardType(cardData._data);
      //       totalOldJSONData[cardCode].type =  getCardType(cardData._data);
      //     }
      //   }
      // });

      // Sort for Patch Note
      const sortRules = ['name'];
      totalOldJSONData = Utiliy.sortObjectByValues(totalOldJSONData, sortRules);
      totalNewJSONData = Utiliy.sortObjectByValues(totalNewJSONData, sortRules);

      const generateElementContent = (tag, content, styles = {}, others = {}) => {
        let tagElement = document.createElement(tag);
        if (Utiliy.isElement(content)) {
          tagElement.appendChild(content);
        } else {
          tagElement.appendChild(document
            .createTextNode(content));
        }

        Object.keys(styles).forEach(styleName => {
          tagElement.style[styleName] = styles[styleName];
        });

        if (others['class']) {
          tagElement.className = others['class']
        }
        if (others['data-url']) {
          // tagElement.dataset['data-url'] = escape(others['data-url']);
          $(tagElement).attr('data-url', others['data-url'])
        }

        return tagElement;
      }

      const generateContentList = (list) => {
        let ul = document.createElement('ul');
        list.forEach(l => {
          if (typeof l == 'object' && !Utiliy.isElement(l)) {
            ul.appendChild(generateElementContent('li', l.content, l.style || {}));
          } else {
            ul.appendChild(generateElementContent('li', l));
          }
        });

        return ul;
      }

      const addLines = (lines) => {
        displayFragment.appendChild(generateContentList(lines));
      }

      const addContent = (content, styles = {}, others = {}) => {
        displayFragment.appendChild(generateElementContent('span', content, styles, others));
        displayFragment.appendChild(document.createElement('br'));
      }

      const addContents = (list) => {
        list.forEach(li => {
          addContent(li);
        });
      }

      const commonPrefix = !options.display ? '* ' : '';

      let newPrefixText = "Text becomes: \"";
      let oldPrefixText = "Old Text: \"";
      let newPrefixLevelUp = "Level Up becomes: \"";
      let oldPrefixLevelUp = "Old Level Up: \"";
      let newPrefixFlavor = "Flavor becomes: \"";
      let oldPrefixFlavor = "Old Flavor: \"";
      let newKeywordPrefix = "Now gain ";
      let removedKeywordPrefix = "No longer ";
      let addedHighlightedContent = '';
      let removedHighlightedContent = '';
      let startTipContent = '';
      let endTipContent = '';

      if (!options.display) {
        newPrefixText = '* ' + newPrefixText;
        oldPrefixText = '** ' + oldPrefixText;
        newPrefixLevelUp = '* ' + newPrefixLevelUp;
        oldPrefixLevelUp = '** ' + oldPrefixLevelUp;
        newPrefixFlavor = "* " + newPrefixFlavor;
        oldPrefixFlavor = "** " + oldPrefixFlavor;
        addedHighlightedContent = `'''`;
        removedHighlightedContent = `''`;
        startTipContent = '{{TipLoR|';
        endTipContent = '}}';
      }

      Object.keys(totalNewJSONData).forEach(cardCode => {
        const oldCard = totalOldJSONData[cardCode];
        const newCard = totalNewJSONData[cardCode];
        if (JSON.stringify(oldCard) != JSON.stringify(newCard)) {
          const lines = [];
          let isChanged = false;
          let isNew = false;

          if (!oldCard) {
            lines.push(commonPrefix + `Added.`);
            isNew = true;
          } else {
            // newCard.code == '03SI015' && console.log(JSON.stringify(oldCard), JSON.stringify(newCard))
            if (oldCard.name != newCard.name) {
              lines.push(commonPrefix + `Renamed from ${addedHighlightedContent + oldCard.name + addedHighlightedContent}.`);
              isChanged = true;
            }

            if (oldCard.cost != newCard.cost) {
              lines.push(commonPrefix + `Mana cost ${oldCard.cost < newCard.cost ? 'increased' : 'reduced'} to ${newCard.cost} from ${oldCard.cost}.`);
              isChanged = true;
            }

            if (oldCard.power != newCard.power) {
              lines.push(commonPrefix + `Power ${oldCard.power < newCard.power ? 'increased' : 'reduced'} to ${newCard.power} from ${oldCard.power}.`);
              isChanged = true;
            }

            if (oldCard.health != newCard.health) {
              lines.push(commonPrefix + `Health ${oldCard.health < newCard.health ? 'increased' : 'reduced'} to ${newCard.health} from ${oldCard.health}.`);
              isChanged = true;
            }

            if (oldCard.spellSpeed != newCard.spellSpeed) {
              const startTip = startTipContent + newCard.spellSpeed + endTipContent;
              const endTip = startTipContent + oldCard.spellSpeed + endTipContent;
              lines.push(commonPrefix + `Spell speed changed to ${startTip} from ${endTip}.`);
              isChanged = true;
            }

            if (oldCard.group != newCard.group) {
              if (!newCard.group) {
                const removedGroupContent = addedHighlightedContent + oldCard.group + addedHighlightedContent;
                lines.push(commonPrefix + `No longer belong to ${removedGroupContent}.`);
              } else if (!oldCard.group) {
                const newGroupContent = addedHighlightedContent + newCard.group + addedHighlightedContent;
                lines.push(commonPrefix + `Now belong to ${newGroupContent}.`);
              } else {
                const removedGroupContent = addedHighlightedContent + oldCard.group + addedHighlightedContent;
                const newGroupContent = addedHighlightedContent + newCard.group + addedHighlightedContent;
                lines.push(commonPrefix + `Now belong to ${newGroupContent} instead of ${removedGroupContent}.`);
              }
              isChanged = true;
            }

            let removedKeywords = oldCard.keywords.filter(x => !newCard.keywords.includes(x));
            let newKeywords = newCard.keywords.filter(x => !oldCard.keywords.includes(x));
            if (newKeywords.length) {
              let content = commonPrefix + newKeywordPrefix + startTipContent + newKeywords.join(endTipContent + ', ') + endTipContent + '.';

              let span = document.createElement('span');
              span.appendChild(document.createTextNode(content));

              lines.push(span);
              isChanged = true;
            }

            if (removedKeywords.length) {
              let content = commonPrefix + removedKeywordPrefix + startTipContent + removedKeywords.join(endTipContent + ', ') + endTipContent + '.';

              let span = document.createElement('span');
              span.appendChild(document.createTextNode(content));

              lines.push(span);
              isChanged = true;
            }

            // Description
            if (oldCard.description != newCard.description) {
              isChanged = true;
              if (oldCard.description.trim() == newCard.description.trim()) {
                lines.push(commonPrefix + `Visual Updated.`);
              } else {
                const diffParts = Diff.diffWords(oldCard.description, "\n" + newCard.description, {
                  newlineIsToken: false,
                  // ignoreCase: true
                });

                let cleanedDiffParts = this.getCleanedDiffParts(diffParts);

                let newDiv = document.createElement('span');
                [{ value: newPrefixText }, ...cleanedDiffParts, { value: "\"" }].filter(part => !part.removed).forEach((part, index) => {
                  // green for additions, red for deletions
                  // grey for common parts
                  const color = part.added ? 'green' :
                    part.removed ? 'red' : 'black';
                  let span = document.createElement('span');
                  span.style.color = color;

                  if (index == 1 && part.value == '\n') {
                    return;
                  }

                  let content = part.value;
                  if (part.added) {
                    content = addedHighlightedContent + part.value + addedHighlightedContent
                  }

                  span.appendChild(document.createTextNode(content));
                  newDiv.appendChild(span);
                });
                lines.push(newDiv);

                let oldDiv = document.createElement('span');
                [{ value: oldPrefixText }, ...cleanedDiffParts, { value: "\"" }].filter(part => !part.added).forEach((part, index) => {
                  const color = part.added ? 'green' :
                    part.removed ? 'red' : 'black';
                  let span = document.createElement('span');
                  span.style.color = color;

                  let content = part.value;
                  if (part.removed) {
                    content = removedHighlightedContent + part.value + removedHighlightedContent;
                  }

                  span.appendChild(document.createTextNode(content));
                  oldDiv.appendChild(span);
                });

                if (options.display) {
                  lines.push({
                    content: oldDiv,
                    style: { 'margin-left': '20px' }
                  });
                } else {
                  lines.push(oldDiv);
                }
              }
            }

            // Level Up
            if (oldCard.levelupDescription != newCard.levelupDescription) {
              isChanged = true;
              if (oldCard.levelupDescription.trim() == newCard.levelupDescription.trim()) {
                lines.push(commonPrefix + `Visual Updated.`);
              } else {
                const diffParts = Diff.diffWords(oldCard.levelupDescription, "\n" + newCard.levelupDescription, {
                  newlineIsToken: false,
                  // ignoreCase: true
                });

                let cleanedDiffParts = this.getCleanedDiffParts(diffParts);

                let newDiv = document.createElement('span');
                [{ value: newPrefixLevelUp }, ...cleanedDiffParts, { value: "\"" }].filter(part => !part.removed).forEach((part, index) => {
                  // green for additions, red for deletions
                  // grey for common parts
                  const color = part.added ? 'green' :
                    part.removed ? 'red' : 'black';
                  let span = document.createElement('span');
                  span.style.color = color;

                  if (index == 1 && part.value == '\n') {
                    return;
                  }

                  let content = part.value;
                  if (part.added) {
                    content = addedHighlightedContent + part.value + addedHighlightedContent
                  }

                  span.appendChild(document.createTextNode(content));
                  newDiv.appendChild(span);
                });
                lines.push(newDiv);

                let oldDiv = document.createElement('span');
                [{ value: oldPrefixLevelUp }, ...cleanedDiffParts, { value: "\"" }].filter(part => !part.added).forEach((part, index) => {
                  const color = part.added ? 'green' :
                    part.removed ? 'red' : 'black';
                  let span = document.createElement('span');
                  span.style.color = color;

                  let content = part.value;
                  if (part.removed) {
                    content = removedHighlightedContent + part.value + removedHighlightedContent;
                  }

                  span.appendChild(document.createTextNode(content));
                  oldDiv.appendChild(span);
                });

                if (options.display) {
                  lines.push({
                    content: oldDiv,
                    style: { 'margin-left': '20px' }
                  });
                } else {
                  lines.push(oldDiv);
                }
              }
            }

            // Flavor
            if (oldCard.flavor != newCard.flavor) {
              isChanged = true;
              const diffParts = Diff.diffWords(oldCard.flavor, "\n" + newCard.flavor, {
                newlineIsToken: false,
                // ignoreCase: true
              });

              let cleanedDiffParts = this.getCleanedDiffParts(diffParts);

              let newDiv = document.createElement('span');
              [{ value: newPrefixFlavor }, ...cleanedDiffParts, { value: "\"" }].filter(part => !part.removed).forEach((part, index) => {
                // green for additions, red for deletions
                // grey for common parts
                const color = part.added ? 'green' :
                  part.removed ? 'red' : 'black';
                let span = document.createElement('span');
                span.style.color = color;

                if (index == 1 && part.value == '\n') {
                  return;
                }

                let content = part.value;
                if (part.added) {
                  content = addedHighlightedContent + part.value + addedHighlightedContent
                }

                span.appendChild(document.createTextNode(content));
                newDiv.appendChild(span);
              });
              lines.push(newDiv);

              let oldDiv = document.createElement('span');
              [{ value: oldPrefixFlavor }, ...cleanedDiffParts, { value: "\"" }].filter(part => !part.added).forEach((part, index) => {
                const color = part.added ? 'green' :
                  part.removed ? 'red' : 'black';
                let span = document.createElement('span');
                span.style.color = color;

                let content = part.value;
                if (part.removed) {
                  content = removedHighlightedContent + part.value + removedHighlightedContent;
                }

                span.appendChild(document.createTextNode(content));
                oldDiv.appendChild(span);
              });

              if (options.display) {
                lines.push({
                  content: oldDiv,
                  style: { 'margin-left': '20px' }
                });
              } else {
                lines.push(oldDiv);
              }
            }
          }
          // Add Header
          if (lines.length) {
            displayFragment.appendChild(document.createElement('br'))
            if (isChanged) {
              this.cardChanged.push(newCard);
            } else if (isNew) {
              this.cardAdded.push(newCard);
            }

            let others = {
              class: 'hover-preview'
            }

            if (PatchInfo[this.patchIDs.new]) {
              others['data-url'] = this.getAPIImage(PatchInfo[this.patchIDs.new].code, newCard.code)
            }

            if (options.patchNote) {
              addContent(`{{LoR|${newCard.name}|code=${newCard.code}}}`, {}, others);
            }
            if (options.display) {
              addContent(`${newCard.name} (${newCard.code})`, {}, others);
            }

            if (options.newChangeLog || options.oldChangeLog) {
              let edittedCardName = newCard.name;
              if (newCard.type == 'Champion' && newCard.code.indexOf('T') >= 0) {
                edittedCardName += ' (Level 2)';
              }
              if (options.newChangeLog) {
                addContent(`== Change Log ==`);
                addContent(`{| class="article-table ruling-table"`);
                addContent(`! colspan="2" | ${edittedCardName}`, { 'font-weight': 'bold' });
              } else {
                addContent(`${edittedCardName}`, { 'font-weight': 'bold' });
              }
              addContent(`|-`);
              addContent(`| [[V${this.patchIDs.new} (Legends of Runeterra)|V${this.patchIDs.new}]]`);
              addContent(`|`);
            }

            // Change Content
            if (options.display) {
              addLines(lines);
            } else {
              addContents(lines);
            }

            if (options.newChangeLog) {
              addContent(`|}`);
            }
          }
        }
      });

      // Check Removed cards
      Object.keys(totalOldJSONData).forEach(cardCode => {
        const oldCard = totalOldJSONData[cardCode];
        const newCard = totalNewJSONData[cardCode];
        if (!newCard) {
          const lines = [];

          lines.push(commonPrefix + `Removed.`);

          // Add Header
          if (lines.length) {
            displayFragment.appendChild(document.createElement('br'))
            this.cardChanged.push(oldCard);

            if (options.patchNote) {
              addContent(`{{LoR|${oldCard.name}|code=${oldCard.code}}}`);
            }
            if (options.display) {
              addContent(`${oldCard.name} (${oldCard.code})`);
            }

            if (options.newChangeLog || options.oldChangeLog) {
              let edittedCardName = oldCard.name;
              if (oldCard.type == 'Champion' && oldCard.code.indexOf('T') >= 0) {
                edittedCardName += ' (Level 2)';
              }
              if (options.newChangeLog) {
                addContent(`== Change Log ==`);
                addContent(`{| class="article-table ruling-table"`);
                addContent(`! colspan="2" | ${edittedCardName}`, { 'font-weight': 'bold' });
              } else {
                addContent(`${edittedCardName}`, { 'font-weight': 'bold' });
              }
              addContent(`|-`);
              addContent(`| [[V${this.patchIDs.new} (Legends of Runeterra)|V${this.patchIDs.new}]]`);
              addContent(`|`);
            }

            // Change Content
            if (options.display) {
              addLines(lines);
            } else {
              addContents(lines);
            }

            if (options.newChangeLog) {
              addContent(`|}`);
            }
          }
        }
      });

      display.appendChild(displayFragment);

      $('.hover-preview').anarchytip();
    }, 0);

  }

  copyResourceImages() {
    const folderPath = this.resourceImageFolder.split("\\").slice(0, -1).join("\\");

    let cardChangeContent = this.cardChanged.map(card => card.code + '.png').join('\n');
    cardChangeContent += ('\n') + this.cardChanged.map(card => card.code + '-alt.png').join('\n');

    if (this.cardAdded.length) {
      let cardAddedContent = this.cardAdded.map(card => card.code + '.png').join('\n');
      cardAddedContent += ('\n') + this.cardAdded.map(card => card.code + '-alt.png').join('\n');
      cardAddedContent += ('\n') + this.cardAdded.map(card => card.code + '-full.png').join('\n');
      cardAddedContent += ('\n') + this.cardAdded.map(card => card.code + '-alt-full.png').join('\n');

      cardChangeContent = cardChangeContent + '\n' + cardAddedContent;
    }
    const blob = new Blob([cardChangeContent], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${this.patchIDs.new}_CardChangesList.txt`);
  }

  convertNewCards() {
    var result = {};

    let database = {}
    Object.keys(this.setContents).forEach(setID => {
      JSON.parse(this.setContents[setID][this.patchIDs.new]).forEach(rawData => {
        database[rawData.cardCode] = rawData;
      })
    });

    this.cardAdded.forEach(addedCard => {
      let cardData = database[addedCard.code];
      result[cardData.cardCode] = Utiliy.cleanObject({
        name: cardData.name,
        type: cardData.type,
        rarity: cardData.collectible ? cardData.rarityRef : 'None',
        subtype: (cardData.subtype || '').toLowerCase(),
        supertype: cardData.supertype,
        keywords: cardData.keywords,
        collectible: cardData.collectible,
        cost: cardData.cost,
        power: cardData.attack,
        health: cardData.health,
        desc: cardData.descriptionRaw,
        lvldesc: cardData.levelupDescriptionRaw,
        flavor: cardData.flavorText,
        artist: cardData.artistName
      })
    });

    result = Utiliy.sortObjectByKey(result);

    let fileContent = JSON.stringify(result, (key, value) => {
      if (Array.isArray(value) && !value.some(x => x && typeof x === 'object')) {
        return `\uE000${JSON.stringify(value.map(v => typeof v === 'string' ? v.replace(/"/g, '\uE001') : v))}\uE000`;
      }
      return value;
    }, 4).replace(/"\uE000([^\uE000]+)\uE000"/g, match => match.substr(2, match.length - 4).replace(/\\"/g, '"').replace(/\uE001/g, '\\\"'));

    fileContent = fileContent.split(`[`).join(`{`);
    fileContent = fileContent.split(`]`).join(`}`);
    fileContent = fileContent.split(`"0`).join(`["0`);
    
    let titles = ['name', 'type', 'rarity', 'subtype', 'supertype', 'keywords', 'collectible', 'cost', 'power', 'health', 'desc', 'lvldesc', 'flavor', 'artist']
    
    titles.forEach(title => {
      fileContent = fileContent.split(`"${title}": `).join(`["${title}"]`.padEnd(17, ' ') + '= ');
    });

    fileContent = fileContent.split(`": {`).join(`"] = {`);

    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${this.patchIDs.new}_AddedCardsData.txt`);
  }

  getCleanedDiffParts(diffParts) {
    let cleanedDiffParts = [...diffParts];
    let emptyDiffIndexs = [];
    cleanedDiffParts.forEach((part, index) => {
      if (!part.added && !part.removed && part.value == " ") {
        emptyDiffIndexs.push(index);
      }
    })
    emptyDiffIndexs.forEach(emptyIndex => {
      if (emptyIndex - 2 >= 0) {
        cleanedDiffParts[emptyIndex - 2].value += cleanedDiffParts[emptyIndex].value;
      }
      if (emptyIndex - 1 >= 0) {
        cleanedDiffParts[emptyIndex - 1].value += cleanedDiffParts[emptyIndex].value;
      }
    });
    emptyDiffIndexs.reverse().forEach(emptyIndex => {
      cleanedDiffParts.splice(emptyIndex, 1)
    });

    // Join continuous added/removed parts
    cleanedDiffParts.forEach((part, index) => {
      if (part.removed) {
        let loopIndex = index;
        let sameIndexes = [];
        let firstPart = cleanedDiffParts[loopIndex];
        while (loopIndex + 2 <= cleanedDiffParts.length - 1) {
          if (cleanedDiffParts[loopIndex + 1].added) {
            if (cleanedDiffParts[loopIndex + 1].value.indexOf(" ") >= 0 &&
              cleanedDiffParts[loopIndex + 1].value.slice(-1) != ' ') {
              break;
            }

            if (cleanedDiffParts[loopIndex + 2].removed) {
              sameIndexes.push(loopIndex + 2);
            } else {
              break;
            }
          } else {
            break;
          }
          loopIndex += 2;
        }

        sameIndexes.forEach(i => {
          firstPart.value += cleanedDiffParts[i].value;
        });

        sameIndexes.reverse().forEach(i => {
          cleanedDiffParts.splice(i, 1)
        });
      } else if (part.added) {
        let loopIndex = index;
        let sameIndexes = [];
        let firstPart = cleanedDiffParts[loopIndex];
        while (loopIndex + 1 <= cleanedDiffParts.length - 1) {
          if (cleanedDiffParts[loopIndex + 1].added) {
            sameIndexes.push(loopIndex + 1);
          } else {
            break;
          }
          loopIndex += 1;
        }

        sameIndexes.forEach(i => {
          firstPart.value += cleanedDiffParts[i].value;
        });

        sameIndexes.reverse().forEach(i => {
          cleanedDiffParts.splice(i, 1)
        });
      }
    });

    // Clean up parts
    cleanedDiffParts.forEach((part, index) => {
      let nextPart = cleanedDiffParts[index + 1];
      if (!nextPart) {
        return;
      }

      if ((part.added && nextPart.added) || (part.removed && nextPart.removed)) {
        part.value += nextPart.value;
        nextPart.value = '';
      }
    });

    cleanedDiffParts = cleanedDiffParts.filter(part => part.value != '');

    cleanedDiffParts.forEach((part, index) => {
      if (part.added || part.removed) {
        if (part.value[0] == ' ') {
          if (cleanedDiffParts[index - 1]) {
            part.value = part.value.slice(1);
            cleanedDiffParts[index - 1].value = cleanedDiffParts[index - 1].value + " ";
          }
        }
        if (part.value[part.value.length - 1] == ' ') {
          if (cleanedDiffParts[index + 1]) {
            part.value = part.value.slice(0, -1);
            cleanedDiffParts[index + 1].value = " " + cleanedDiffParts[index + 1].value;
          }
        }
      }
    });

    return cleanedDiffParts;
  }
}
