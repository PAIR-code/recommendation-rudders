/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed } from '@angular/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { SavedDataService } from '../services/saved-data.service';
import { ExpStageVotes, LeaderVote, UserData, UserProfile, Votes, fakeVote } from '../../lib/staged-exp/data-model';

@Component({
  selector: 'app-exp-leader-vote',
  templateUrl: './exp-leader-vote.component.html',
  styleUrl: './exp-leader-vote.component.scss',
  standalone: true,
  imports: [MatRadioModule, MatButtonModule],
})
export class ExpLeaderVoteComponent {
  public currStage: Signal<ExpStageVotes>;
  public otherParticipants: Signal<UserData[]>;

  readonly LeaderVote = LeaderVote;
  public votes: Votes;

  constructor(private dataService: SavedDataService) {
    this.currStage = computed(() => {
      const currStage = this.dataService.currentStage();
      if (currStage.kind !== 'leader-vote') {
        throw new Error(`Bad stage kind for group-chat component: ${currStage.kind}`);
      }
      return currStage;
    });

    this.otherParticipants = computed(() => {
      const thisUserId = this.dataService.user().userId;
      const allUsers = Object.values(this.dataService.data().experiment.participants);
      return allUsers.filter((u) => u.userId !== thisUserId);
    });

    // Make sure that votes has all other participants, and only them.
    this.votes = this.currStage().config;
    const otherParticipantsMap: { [userId: string]: UserData } = {};
    for (const p of this.otherParticipants()) {
      otherParticipantsMap[p.userId] = p;
      if (!(p.userId in this.votes)) {
        this.votes[p.userId] = LeaderVote.NOT_RATED;
      }
    }
    Object.keys(this.votes).forEach((uid) => {
      if (!(uid in otherParticipantsMap)) {
        delete this.votes[uid];
      }
    });
  }

  // True when all other users have been voted on.
  isComplete() {
    let completed = true;
    this.otherParticipants().forEach((u) => {
      if (!(u.userId in this.votes) || this.votes[u.userId] === LeaderVote.NOT_RATED) {
        completed = false;
      }
    });
    return completed;
  }

  setVote(event: unknown, userId: string) {
    const { value } = event as { value: LeaderVote };
    if (this.isComplete()) {
      this.dataService.setStageComplete(true);
    }
    this.votes[userId] = value;
    this.dataService.editCurrentExpStageData<Votes>(() => this.votes);
  }

  resetVote(userId: string) {
    this.votes[userId] = LeaderVote.NOT_RATED;
    this.dataService.editCurrentExpStageData<Votes>(() => this.votes);
  }
}
