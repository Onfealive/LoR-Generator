import { NgModule } from '@angular/core';
import { Routes, RouterModule, ExtraOptions } from '@angular/router';
import { PatchNotesGeneratorComponent } from './patch-notes-generator/patch-notes-generator.component';
import { ExpeditionGeneratorComponent } from './expedition-generator/expedition-generator.component';
import { AboutComponent } from './about/about.component';
import { DatabaseComponent } from './database/database.component';
import { TextFormatterComponent } from './text-formatter/text-formatter.component';
import { UtilityComponent } from './utility/utility.component';
import { UnownedCardsComponent } from './unowned-cards/unowned-cards.component';

const routes: Routes = [
  { path: "patch-note", component: PatchNotesGeneratorComponent },
  // { path: "expedition", component: ExpeditionGeneratorComponent },
  { path: "text-formatter", component: TextFormatterComponent },
  { path: "database", component: DatabaseComponent },
  { path: "unowned-cards", component: UnownedCardsComponent },
  { path: "utility", component: UtilityComponent },
  { path: "about", component: AboutComponent },
  { path: '', redirectTo: '/patch-note', pathMatch: 'full' }
];

const routerOptions: ExtraOptions = {
  useHash: false,
  anchorScrolling: 'enabled',
  relativeLinkResolution: 'legacy'
};

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
