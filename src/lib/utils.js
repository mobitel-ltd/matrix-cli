const moment = require('moment');
const url = require('url');

const protocol = 'https';
const matrixHost = 'matrix';

const getMatrixHostName = domain => [matrixHost, domain].join('.');

const isLimit = str => +str > 1 && +str < 13;

const getLastRealSenderEvent = (events, ignoreUsers) =>
    events.reverse().find(ev =>
        !(ignoreUsers || []).some(user => ev.getSender().includes(user)));

const getLimitTimestamp = limit => moment().subtract(limit, 'months').valueOf();

const parseRoom = ignoreUsers => ({roomId, name: roomName, timeline}) => {
    const lastEvent = getLastRealSenderEvent(timeline, ignoreUsers);
    if (!lastEvent) {
        return;
    }
    const timestamp = lastEvent.getTs();
    const date = lastEvent.getDate();

    return {roomName, roomId, timestamp, date};
};

const getOutdatedRooms = limit => ({timestamp}) => (timestamp < getLimitTimestamp(limit));

const getRoomsLastUpdate = (rooms, limit, ignoreUsers) =>
    rooms
        .map(parseRoom(ignoreUsers || []))
        .filter(Boolean)
        .filter(getOutdatedRooms(limit));

const getBaseUrl = domain => url.format({protocol, hostname: getMatrixHostName(domain)});
const getUserId = (userName, domain) => `@${userName}:${getMatrixHostName(domain)}`;

module.exports = {
    getBaseUrl,
    getUserId,
    getLastRealSenderEvent,
    isLimit,
    getLimitTimestamp,
    getRoomsLastUpdate,
};
