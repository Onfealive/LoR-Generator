import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PatchNotesGeneratorComponent } from './patch-notes-generator/patch-notes-generator.component';
import { ExpeditionGeneratorComponent } from './expedition-generator/expedition-generator.component';
import { AboutComponent } from './about/about.component';


const routes: Routes = [
  { path: "patch-note", component: PatchNotesGeneratorComponent },
  { path: "expedition", component: ExpeditionGeneratorComponent },
  { path: "about", component: AboutComponent },
  { path: '',   redirectTo: '/patch-note', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
