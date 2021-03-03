import { Component, OnInit } from '@angular/core';
import * as Diff from "diff";
import * as Utility from "../shared/utility";
import { saveAs } from 'file-saver';
import { PatchInfo } from '../shared/patches';
import { DatabaseService } from '../shared/database.service';

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

  defaultImage = `./assets/icons/Queue Card Back.png`;

  resourceImageFolder = '';

  isDisplayAddedData = true;
  isDisplayChangedData = true;

  selectedPatch = null;
  comparingPatch = null;
  selectedDatabase = {};
  comparingDatabase = {};

  customDatabase = {};

  isCompleted = false;

  patchInfo = [];
  logs: any = [];
  PatchInfo = PatchInfo; // for Client-only

  constructor(
    private databaseService: DatabaseService
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
    });

    let selectedPatchIndex = this.patchInfo.findIndex(p => p.checked);
    this.selectedPatch = this.patchInfo[selectedPatchIndex].name;
    this.comparingPatch = this.patchInfo[selectedPatchIndex - 1].name;
  }

  getChangedCard() {
    return this.logs.filter(l => l.type == 'change').map(l => l.data);
  }

  getAddedCard() {
    return this.logs.filter(l => l.type == 'add').map(l => l.data);
  }

  selectPatchInfo(pathcInfo) {
    this.patchInfo.find(p => p.checked).checked = false;
    pathcInfo.checked = true;
    this.isCompleted = false;

    let selectedPatchIndex = this.patchInfo.findIndex(p => p.checked);
    this.selectedPatch = this.patchInfo[selectedPatchIndex].name;
    this.comparingPatch = this.patchInfo[selectedPatchIndex - 1].name;
  }

  compare(options: any = { display: true }) {
    let flag = 0;
    if (this.selectedPatch !== 'custom') {
      this.databaseService.getCardData(this.comparingPatch).subscribe(database => {
        this.comparingDatabase = database;
        flag++;
        if (flag == 2) {
          setTimeout(() => {
            this._compareJson(options);
          }, 0);
        }
      });
      this.databaseService.getCardData(this.selectedPatch).subscribe(database => {
        this.selectedDatabase = database;
        flag++;
        if (flag == 2) {
          setTimeout(() => {
            this._compareJson(options);
          }, 0);
        }
      });
    } else {
      this.selectedDatabase = this.customDatabase;
      this.databaseService.getCardData().subscribe(database => {
        this.comparingDatabase = database;
        setTimeout(() => {
          this._compareJson(options);
        }, 0);
      });
    }
  }

  getAPIImage(patchCode, cardcode) {
    return this.databaseService.getAPIImage(patchCode, cardcode);
  }

  optionChanged(inputOption) {
    let options = {};
    options[inputOption] = true;
    this.compare(options);
  }

  onSelect(event) {
    this.error = '';
    this.isCompleted = false;
    this.files = [];

    const draggedFiles = [...event.addedFiles];
    draggedFiles.sort((a, b) => {
      return a.name - b.name;
    });
    for (let i = 0; i <= draggedFiles.length - 2; i += 2) {
      let currentFile = draggedFiles[i].name.replace('.json', '').split('_');
      let nextFile = draggedFiles[i + 1].name.replace('.json', '').split('_');

      if (!["set1", "set2", "set3", "set4"].includes(currentFile[0]) || !["set1", "set2", "set3", "set4"].includes(nextFile[0])) {
        this.error = 'Only support Set 1 to 4.';
        return;
      }
    }

    this.files.push(...draggedFiles);

    this.customDatabase = {};
    this.selectedPatch = 'custom';

    let customDatabase = {};
    let countFiles = 0;

    this.files.forEach(file => {
      let currentFile = file.name.replace('.json', '').split('_');

      const selectedFile = file;
      const fileReader = new FileReader();
      fileReader.readAsText(selectedFile, "UTF-8");
      fileReader.onload = () => {
        if (!customDatabase[currentFile[0]]) {
          customDatabase[currentFile[0]] = {};
        }
        customDatabase[currentFile[0]][currentFile[1]] = fileReader.result as string;

        countFiles += 1;
        if (countFiles == this.files.length) {
          this.customDatabase = this.databaseService._convertData2Database(customDatabase, currentFile[1])
          this.compare();
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

  _compareJson(options: any = { display: true }) {
    this.isCompleted = true;

    // Init
    const defaults = {
      display: false,
      patchNote: false,
      newChangeLog: false,
      oldChangeLog: false
    };

    options = Object.assign({}, defaults, options);

    // Handleing
    let totalOldJSONData = this.comparingDatabase;
    let totalNewJSONData = this.selectedDatabase;

    // Sort for Patch Note
    const sortRules = ['sortedCode'];
    totalOldJSONData = Utility.sortObjectByValues(totalOldJSONData, sortRules);
    totalNewJSONData = Utility.sortObjectByValues(totalNewJSONData, sortRules);

    this.logs = [];

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
        let log = {
          'data': newCard,
          'diff': [],
          'type': 'change'
        };

        if (!oldCard) {
          log.diff.push(commonPrefix + `Added.`);
          log.type = 'add'
        } else {
          // newCard.code == '03SI015' && console.log(JSON.stringify(oldCard), JSON.stringify(newCard))
          if (oldCard.name != newCard.name) {
            log.diff.push(commonPrefix + `Renamed from ${addedHighlightedContent + oldCard.name + addedHighlightedContent}.`);
          }

          if (oldCard.cost != newCard.cost) {
            log.diff.push(commonPrefix + `Mana cost ${oldCard.cost < newCard.cost ? 'increased' : 'reduced'} to ${newCard.cost} from ${oldCard.cost}.`);
          }

          if (oldCard.power != newCard.power) {
            log.diff.push(commonPrefix + `Power ${oldCard.power < newCard.power ? 'increased' : 'reduced'} to ${newCard.power} from ${oldCard.power}.`);
          }

          if (oldCard.health != newCard.health) {
            log.diff.push(commonPrefix + `Health ${oldCard.health < newCard.health ? 'increased' : 'reduced'} to ${newCard.health} from ${oldCard.health}.`);
          }

          if (oldCard.spellSpeed != newCard.spellSpeed) {
            const startTip = startTipContent + newCard.spellSpeed + endTipContent;
            const endTip = startTipContent + oldCard.spellSpeed + endTipContent;
            log.diff.push(commonPrefix + `Spell speed changed to ${startTip} from ${endTip}.`);
          }

          if (oldCard.group != newCard.group) {
            if (!newCard.group) {
              const removedGroupContent = addedHighlightedContent + oldCard.group + addedHighlightedContent;
              log.diff.push(commonPrefix + `No longer belong to ${removedGroupContent}.`);
            } else if (!oldCard.group) {
              const newGroupContent = addedHighlightedContent + newCard.group + addedHighlightedContent;
              log.diff.push(commonPrefix + `Now belong to ${newGroupContent}.`);
            } else {
              const removedGroupContent = addedHighlightedContent + oldCard.group + addedHighlightedContent;
              const newGroupContent = addedHighlightedContent + newCard.group + addedHighlightedContent;
              log.diff.push(commonPrefix + `Now belong to ${newGroupContent} instead of ${removedGroupContent}.`);
            }
          }

          let removedKeywords = oldCard.keywords.filter(x => !newCard.keywords.includes(x));
          let newKeywords = newCard.keywords.filter(x => !oldCard.keywords.includes(x));
          if (newKeywords.length) {
            let content = commonPrefix + newKeywordPrefix + startTipContent + newKeywords.join(endTipContent + ', ') + endTipContent + '.';
            
            log.diff.push(content);
          }

          if (removedKeywords.length) {
            let content = commonPrefix + removedKeywordPrefix + startTipContent + removedKeywords.join(endTipContent + ', ') + endTipContent + '.';

            log.diff.push(content);
          }

          let largeContents = [
            {
              object: 'description',
              newPrefix: newPrefixText,
              oldPrefix: oldPrefixText,
              isCheckedVisual: true
            },
            {
              object: 'levelupDescription',
              newPrefix: newPrefixLevelUp,
              oldPrefix: oldPrefixLevelUp,
              isCheckedVisual: true
            },
            {
              object: 'flavor',
              newPrefix: newPrefixFlavor,
              oldPrefix: oldPrefixFlavor
            }
          ]

          largeContents.forEach(largeContent => {
            if (oldCard[largeContent.object] != newCard[largeContent.object]) {
              if (largeContent.isCheckedVisual && oldCard[largeContent.object].trim() == newCard[largeContent.object].trim()) {
                log.diff.push(commonPrefix + `Visual Updated.`);
              } else {
                const diffParts = Diff.diffWords(oldCard[largeContent.object], "\n" + newCard[largeContent.object], {
                  newlineIsToken: false,
                  // ignoreCase: true
                });

                let cleanedDiffParts = this.getCleanedDiffParts(diffParts);

                let newDiv = [];
                [{ value: largeContent.newPrefix }, ...cleanedDiffParts, { value: "\"" }].filter(part => !part.removed).forEach((part, index) => {
                  // green for additions, red for deletions
                  // grey for common parts
                  const color = part.added ? 'green' :
                    part.removed ? 'red' : 'black';

                  if (index == 1 && part.value == '\n') {
                    return;
                  }

                  let content = part.value;
                  if (part.added) {
                    content = addedHighlightedContent + part.value + addedHighlightedContent
                  }

                  newDiv.push(`<span style="color: ${color}">${content}</span>`);
                });

                if (newDiv.length) {
                  log.diff.push(newDiv.join(''));
                }

                let oldDiv = [];
                [{ value: largeContent.oldPrefix }, ...cleanedDiffParts, { value: "\"" }].filter(part => !part.added).forEach((part, index) => {
                  const color = part.added ? 'green' :
                    part.removed ? 'red' : 'black';

                  let content = part.value;
                  if (part.removed) {
                    content = removedHighlightedContent + part.value + removedHighlightedContent;
                  }

                  oldDiv.push(`<span style="color: ${color}">${content}</span>`);
                });

                if (oldDiv.length) {
                  if (options.display) {
                    oldDiv.unshift(`<span style="display: inline-block; width: 37px;"></span>`);
                  }

                  log.diff.push(oldDiv.join(''));
                }
              }
            }
          });
        }

        if (log.diff.length) {
          if ((this.isDisplayAddedData && log.type == 'add') || (this.isDisplayChangedData && log.type == 'change')) {

            if (options.newChangeLog || options.oldChangeLog) {
              let edittedCardName = newCard.name;
              if (newCard.type == 'Champion' && newCard.code.indexOf('T') >= 0) {
                edittedCardName += ' (Level 2)';
              }

              let unshiftContents = [];
              if (options.newChangeLog && log.type == 'add') {
                unshiftContents = [
                  `== Change Log ==`,
                  `{| class="article-table ruling-table"`,
                  `! colspan="2" | <b>${edittedCardName}</b>`
                ];
              } else {
                unshiftContents = [
                  `<b>${edittedCardName}</b>`
                ];
              }

              unshiftContents = unshiftContents.concat([
                `|-`,
                `| [[V${this.selectedPatch} (Legends of Runeterra)|V${this.selectedPatch}]]`,
                `|`
              ]);

              log.diff.unshift(unshiftContents.join('<br />'));
            }

            if (options.newChangeLog && log.type == 'add') {
              log.diff.push(`|}`);
            }

            this.logs.push(log);
          }
        }
      }
    });

    // Check Removed cards
    Object.keys(totalOldJSONData).forEach(cardCode => {
      const oldCard = totalOldJSONData[cardCode];
      const newCard = totalNewJSONData[cardCode];
      if (!newCard) {
        let log = {
          'data': oldCard,
          'diff': [],
          'type': 'remove'
        };

        log.diff.push(commonPrefix + `Removed.`);

        if (log.diff.length) {
          if (options.newChangeLog || options.oldChangeLog) {
            let edittedCardName = newCard.name;
            if (newCard.type == 'Champion' && newCard.code.indexOf('T') >= 0) {
              edittedCardName += ' (Level 2)';
            }

            let unshiftContents = [];
            if (options.newChangeLog && log.type == 'add') {
              unshiftContents = [
                `== Change Log ==`,
                `{| class="article-table ruling-table"`,
                `! colspan="2" | <b>${edittedCardName}</b>`
              ];
            } else {
              unshiftContents = [
                `<b>${edittedCardName}</b>`
              ];
            }

            unshiftContents = unshiftContents.concat([
              `|-`,
              `| [[V${this.selectedPatch} (Legends of Runeterra)|V${this.selectedPatch}]]`,
              `|`
            ]);

            log.diff.unshift(unshiftContents.join('<br />'));
          }

          if (options.newChangeLog && log.type == 'add') {
            log.diff.push(`|}`);
          }

          this.logs.push(log);
        }
      }
    });

    console.log(this.logs)
  }

  copyResourceImages() {
    const folderPath = this.resourceImageFolder.split("\\").slice(0, -1).join("\\");
    let changedCards = this.logs.filter(l => l.type = 'change').map(l => l.data)
    let addedCards = this.logs.filter(l => l.type = 'add').map(l => l.data)

    let cardChangeContent = changedCards.map(card => card.code + '.png').join('\n');
    cardChangeContent += ('\n') + changedCards.map(card => card.code + '-alt.png').join('\n');

    if (addedCards.length) {
      let cardAddedContent = addedCards.map(card => card.code + '.png').join('\n');
      cardAddedContent += ('\n') + addedCards.map(card => card.code + '-alt.png').join('\n');
      cardAddedContent += ('\n') + addedCards.map(card => card.code + '-full.png').join('\n');
      cardAddedContent += ('\n') + addedCards.map(card => card.code + '-alt-full.png').join('\n');

      cardChangeContent = cardChangeContent + '\n' + cardAddedContent;
    }
    const blob = new Blob([cardChangeContent], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${this.selectedPatch}_CardChangesList.txt`);
  }

  convertNewCards() {
    let addedCards = this.logs.filter(l => l.type = 'add').map(l => l.data)
    var result = {};

    let database = {};
    if (this.selectedPatch !== 'custom') {
      database = this.selectedDatabase;
    } else {
      database = this.customDatabase;
    }

    addedCards.forEach(addedCard => {
      let cardData = database[addedCard.code]._data;
      let subtype = Utility.capitalize(cardData.subtype);

      result[cardData.cardCode] = Utility.cleanObject({
        name: cardData.name,
        type: cardData.type,
        rarity: cardData.collectible ? cardData.rarityRef : 'None',
        subtype: subtype ? [subtype] : '',
        supertype: cardData.supertype,
        keywords: cardData.keywords,
        keywordRefs: cardData.keywords,
        collectible: cardData.collectible,
        cost: cardData.cost,
        power: cardData.attack,
        health: cardData.health,
        desc: cardData.descriptionRaw,
        lvldesc: cardData.levelupDescriptionRaw,
        categoryRefs: subtype ? [subtype] : '',
        flavor: cardData.flavorText,
        artist: cardData.artistName
      })
    });

    result = Utility.sortObjectByKey(result);

    let fileContent = JSON.stringify(result, (key, value) => {
      if (Array.isArray(value) && !value.some(x => x && typeof x === 'object')) {
        return `\uE000${JSON.stringify(value.map(v => typeof v === 'string' ? v.replace(/"/g, '\uE001') : v))}\uE000`;
      }
      return value;
    }, 4).replace(/"\uE000([^\uE000]+)\uE000"/g, match => match.substr(2, match.length - 4).replace(/\\"/g, '"').replace(/\uE001/g, '\\\"'));

    fileContent = fileContent.split(`\\r\\n`).join(`<br />`);
    fileContent = fileContent.split(`\\n`).join(`<br />`);
    fileContent = fileContent.split(`[`).join(`{`);
    fileContent = fileContent.split(`]`).join(`}`);
    fileContent = fileContent.split(`"0`).join(`["0`);

    let titles = ['name', 'type', 'rarity', 'subtype', 'supertype', 'keywords', 'keywordRefs', 'collectible', 'cost', 'power', 'health', 'desc', 'lvldesc', 'categoryRefs', 'flavor', 'artist']

    titles.forEach(title => {
      fileContent = fileContent.split(`"${title}": `).join(`["${title}"]`.padEnd(17, ' ') + '= ');
    });

    fileContent = fileContent.split(`": {`).join(`"] = {`);

    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${this.selectedPatch}_AddedCardsData.txt`);
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
