import { Routes } from '@angular/router';
import { FeedbackComponent } from './feedback/feedback';

export const routes: Routes = [
  { path: 'requestform', component: FeedbackComponent },
  { path: '', redirectTo: 'requestform', pathMatch: 'full' },
];
