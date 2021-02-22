import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PatchNotesGeneratorComponent } from './patch-notes-generator/patch-notes-generator.component';

import { NgxDropzoneModule } from 'ngx-dropzone';
import { ExpeditionGeneratorComponent } from './expedition-generator/expedition-generator.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SafeHtmlPipe } from './shared/pipe.safehtml';
import { AboutComponent } from './about/about.component';

@NgModule({
  declarations: [
    AppComponent,
    SafeHtmlPipe,
    PatchNotesGeneratorComponent,
    ExpeditionGeneratorComponent,
    AboutComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxDropzoneModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
