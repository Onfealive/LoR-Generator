import { Component, OnInit } from '@angular/core';
import { DatabaseService } from '../shared/database.service';
import { PatchInfo } from '../shared/patches';

@Component({
    selector: 'app-utility',
    templateUrl: './utility.component.html',
    styleUrls: ['./utility.component.scss']
})
export class UtilityComponent implements OnInit {
    versionPattern = /^(\d+\.)?(\d+\.)?(\*|\d+)$/;

    newestPatch = '';
    rawNewestPatch = '';
    currentPatch = '';

    constructor(
        private databaseService: DatabaseService
    ) { }

    ngOnInit(): void {
        this.currentPatch = this.databaseService.newestPatch;
        this.rawNewestPatch = this.currentPatch;
        this.newestPatch = this.patch2code(this.currentPatch);
    }

    getSetArray() {
        let setArray = [];

        if (!this.rawNewestPatch) {
            return setArray;
        }

        console.log(this.rawNewestPatch)

        let maxSet = PatchInfo[this.rawNewestPatch].maxSet;
        let patchInfo = PatchInfo[this.currentPatch];

        if (patchInfo) {
            maxSet = patchInfo.maxSet;
        }


        for (let i = 1; i <= maxSet; i++) {
            setArray.push(i)
        }

        return setArray;
    }

    isValidVersion(version) {
        return this.versionPattern.test(version);
    }

    getJSONLink(patchCode, set) {
        return `http://dd.b.pvp.net/${patchCode}/set${set}/en_us/data/set${set}-en_us.json`;
    }

    patch2code(patchVersion, returnDotted = false) {
        let isDigitEnding = Number.isInteger(+patchVersion[patchVersion.length - 1]);
        if (!isDigitEnding) {
            patchVersion = patchVersion.slice(0, -1);
        }
        for (let i = patchVersion.split(".").length; i < 3; i++) {
            patchVersion += '.0';
        }

        if (returnDotted) {
            return patchVersion;
        }

        return patchVersion.split(".").join('_');
    }

    upcomingPatch(patchVersion, returnDotted = false) {
        let patchCode = this.patch2code(patchVersion);
        let digits = patchCode.split('_');
        digits[1] = +digits[1] + 1;

        return digits.join(returnDotted ? '.' : '_');
    }
}
