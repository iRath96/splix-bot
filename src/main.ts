import Manager from "./Manager";
Manager.manage();

// ws://46.101.194.190:8002/splix

/*
if (m[0] == receiveAction.CHUNK_OF_BLOCKS) {
    for (b = bytesToInt(m[1], m[2]), c = bytesToInt(m[3], m[4]), g = bytesToInt(m[5], m[6]), h = bytesToInt(m[7], m[8]), j = 9, k = b; k < b + g; k++)
        for (var B = c; B < c + h; B++)
            i = getBlock(k, B), i.setBlockId(m[j], !1), j++;
    hasReceivedChunkThisGame || (hasReceivedChunkThisGame = !0, wsSendMsg(sendAction.READY), didSendSecondReady = !0)
}*/


/*
enum TeamReceiveAction {
  URL = 1,
  BECOME_HOST = 2,
  ADD_PLAYER = 3,
  REMOVE_PLAYER = 4,
  REQUEST_IPS = 5,
  GAME_START = 6,
  TEAM_IS_FULL = 7,
  SET_TEAM_USERNAME = 8
}

enum TeamSendAction {
  REQUEST_TEAM_ID = 1,
  MY_USERNAME = 2,
  START_GAME = 3,
  PING_DATA = 4,
  SEND_IPS = 5,
  SET_TEAM_USERNAME = 6
}*/
