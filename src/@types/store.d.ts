import { IGameState } from './game';
import { ColorValues } from '../enum';

export interface StoreState {
  leaderBoard: any[];
  user: any;
}

export interface HomeStoreState {
  lobby: any;
  user: any;
}

export interface GameStoreState {
  game: IGameState;
  lobby: any;
}
