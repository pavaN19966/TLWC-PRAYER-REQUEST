import { Routes } from '@angular/router';
import { MemberDetails } from './member-details/member-details';
import { FeedbackComponent } from './feedback/feedback';

export const routes: Routes = [
  { path: 'member-details', component: MemberDetails },
  { path: 'requestform', component: FeedbackComponent },
  { path: '', redirectTo: 'requestform', pathMatch: 'full' },
];
