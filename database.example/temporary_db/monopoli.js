let monopoliSessions = {};

export function addUser(chatId, sessionData) {
  monopoliSessions[chatId] = sessionData;
}

export function removeUser(chatId) {
  delete monopoliSessions[chatId];
}

export function getUser(chatId) {
  return monopoliSessions[chatId];
}

export function isUserPlaying(chatId) {
  return !!monopoliSessions[chatId];
}

export function updateGame(chatId, updatedData) {
  monopoliSessions[chatId] = updatedData;
}