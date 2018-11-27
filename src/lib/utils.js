const moment = require('moment');
const url = require('url');

const protocol = 'https';

const isLimit = (str) => +str > 1 && +str < 13;

const getLastRealSenderEvent = (events, botName) =>
    events.reverse().find((ev) => !ev.getSender().includes(botName));

const getLimitTimestamp = (limit) => moment().subtract(limit, 'months').valueOf();

const parseRoom = (room, botName) => {
    const {roomId, name: roomName} = room;
    const lastEvent = getLastRealSenderEvent(room.timeline, botName);

    const timestamp = lastEvent.getTs();
    const date = lastEvent.getDate();

    return {roomName, roomId, timestamp, date};
};

const getOutdatedRooms = (limit) => ({timestamp}) => (timestamp < getLimitTimestamp(limit));

const getRoomsLastUpdate = (rooms, date, botName) =>
    rooms
        .map(parseRoom, botName)
        .filter(Boolean)
        .filter(getOutdatedRooms(date));

module.exports = {
    isLimit,
    getLimitTimestamp,
    getRoomsLastUpdate,
    getBaseUrl: (hostname) => url.format({protocol, hostname}),
    getUserId: (userName, domain) => `@${userName}:${domain}`,
};
