import { Action, Dispatch } from 'redux';
import { ThunkAction } from 'redux-thunk';
import * as uuid from 'uuid/v4';
import { StoreState, IGameState } from '../../@types';
import * as constants from '../constants';
import generateBoard from '../../lib/generateBoard';
import { auth, roomsRef } from '../../lib/firebase';
import { push } from 'react-router-redux';

export interface ICreateRoom {
  full: boolean;
  roomId: number;
  type: constants.CREATE_LOBBY;
  state: IGameState;
}

export interface IFetchRoom {
  rooms: {
    joinedRooms: string[];
    waitingRooms: string[];
  };
  type: constants.FETCH_LOBBY;
}

export interface IJoinRoom {
  full: boolean;
  role?: 'black' | 'red';
  roomId: string | null;
  state?: IGameState;
  type: constants.JOIN_LOBBY;
}

export type LobbyAction = ICreateRoom | IJoinRoom | IFetchRoom;

export function CreateRoomAction(): ThunkAction<Promise<Action>, StoreState, void, ICreateRoom> {
  return async (dispatch: Dispatch<Action>): Promise<Action> => {
    try {
      const roomId = uuid();
      const roomData = {
        full: false,
        red: auth.currentUser && auth.currentUser.uid,
        roomId,
        state: generateBoard(),
      };
      await roomsRef.child(roomId.toString()).set(roomData);

      dispatch({
        ...roomData,
        type: constants.CREATE_LOBBY,
      });
      dispatch({
        ...roomData,
        type: constants.GAME_UPDATE,
      });
      return dispatch(push(`/board/${roomId}`));
    } catch (e) {
      console.error(`Error creating lobby: ${e}`);
      return {
        type: constants.CREATE_LOBBY,
      };
    }
  };
}

export function FetchRoomAction(): ThunkAction<Promise<Action>, StoreState, void, IJoinRoom> {
  return async (dispatch: Dispatch<IFetchRoom>): Promise<IFetchRoom> => {
    try {
      const snapshot = await roomsRef.once('value');
      const rooms: any[] = snapshot.val();
      const uid = auth.currentUser && auth.currentUser.uid;

      const availableRooms = Object.keys(rooms).filter(r => !rooms[r].state.winner);
      const joinedRooms = availableRooms.filter(
        r => rooms[r].black === uid || rooms[r].red === uid,
      );
      const waitingRooms = availableRooms.filter(r => !rooms[r].black && rooms[r].red !== uid);

      return dispatch({
        rooms: {
          joinedRooms,
          waitingRooms,
        },
        type: constants.FETCH_LOBBY,
      });
    } catch (error) {
      console.error(error);

      return dispatch({
        rooms: {
          joinedRooms: [],
          waitingRooms: [],
        },
        type: constants.FETCH_LOBBY,
      });
    }
  };
}

export function JoinRoomAction(
  roomId: string,
): ThunkAction<Promise<Action>, StoreState, void, IJoinRoom> {
  return async (dispatch: Dispatch<Action>): Promise<Action> => {
    try {
      const roomRef = roomsRef.child(roomId);
      const snapshot = await roomRef.once('value');
      const existingRoom = snapshot.val();
      const uid = auth.currentUser && auth.currentUser.uid;

      if (!existingRoom) {
        return dispatch({
          full: false,
          roomId: null,
          type: constants.JOIN_LOBBY,
        });
      }

      if (existingRoom.red === uid) {
        dispatch({
          full: false,
          role: 'red',
          roomId,
          state: existingRoom.state,
          type: constants.JOIN_LOBBY,
        });
        dispatch({
          state: existingRoom.state,
          type: constants.GAME_UPDATE,
        });
        return dispatch(push(`/board/${roomId}`));
      }

      if (existingRoom.black === undefined) {
        await roomRef.child('black').set(uid);
        await roomRef.child('full').set(true);
        dispatch({
          full: true,
          role: 'black',
          roomId,
          state: { ...existingRoom.state, black: uid },
          type: constants.JOIN_LOBBY,
        });
        dispatch({
          state: existingRoom.state,
          type: constants.GAME_UPDATE,
        });
        return dispatch(push(`/board/${roomId}`));
      }
      if (existingRoom.black === uid) {
        dispatch({
          full: true,
          role: 'black',
          roomId,
          state: existingRoom.state,
          type: constants.JOIN_LOBBY,
        });
        dispatch({
          state: existingRoom.state,
          type: constants.GAME_UPDATE,
        });
        return dispatch(push(`/board/${roomId}`));
      }

      return dispatch({
        full: false,
        roomId: null,
        type: constants.JOIN_LOBBY,
      });
    } catch (e) {
      console.error(`Error joining lobby: ${e}`);
      return {
        type: constants.JOIN_LOBBY,
      };
    }
  };
}
