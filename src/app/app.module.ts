import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PatchNotesGeneratorComponent } from './patch-notes-generator/patch-notes-generator.component';

import { NgxDropzoneModule } from 'ngx-dropzone';
import { ExpeditionGeneratorComponent } from './expedition-generator/expedition-generator.component';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SafeHtmlPipe } from './shared/pipe.safehtml';
import { AboutComponent } from './about/about.component';
import { DatabaseComponent } from './database/database.component';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { TextFormatterComponent } from './text-formatter/text-formatter.component';
import { ClipboardModule } from 'ngx-clipboard';
import { UtilityComponent } from './utility/utility.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { AutosizeModule } from 'ngx-autosize';
import { UnownedCardsComponent } from './unowned-cards/unowned-cards.component';
import { RangePipe } from './shared/pipe.range';
import { AutofocusFixModule } from 'ngx-autofocus-fix';

@NgModule({
  declarations: [
    AppComponent,
    SafeHtmlPipe,
    RangePipe,
    PatchNotesGeneratorComponent,
    ExpeditionGeneratorComponent,
    AboutComponent,
    DatabaseComponent,
    TextFormatterComponent,
    UtilityComponent,
    UnownedCardsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxDropzoneModule,
    FormsModule,
    ReactiveFormsModule,
    LazyLoadImageModule,
    HttpClientModule,
    ClipboardModule,
    NgSelectModule,
    AutosizeModule,
    AutofocusFixModule.forRoot()
  ],
  providers: [FormBuilder],
  bootstrap: [AppComponent]
})
export class AppModule { }
