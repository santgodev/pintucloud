import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CardComponent } from './components/card/card.component';
import { DatepickerComponent } from './components/datepicker/datepicker.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        CardComponent,
        DatepickerComponent
    ],
    exports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        CardComponent,
        DatepickerComponent
    ]
})
export class SharedModule { }
