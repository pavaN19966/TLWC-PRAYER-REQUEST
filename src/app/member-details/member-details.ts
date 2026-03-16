import { Component } from '@angular/core';
import { FeedbackComponent } from '../feedback/feedback';

@Component({
  selector: 'app-member-details',
  standalone: true,
  imports: [FeedbackComponent],
  templateUrl: './member-details.html',
  styleUrl: './member-details.css',
})
export class MemberDetails {}
