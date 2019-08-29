const moment = require('moment');
const url = require('url');

const protocol = 'https';
const matrixHost = 'matrix';
const LEAVE_ACTION = 'leave';
const INVITE_ACTION = 'invite';
const STOP_ACTION = 'stop';
const SEND_ACTION = 'send';
const ALL_ROOMS_ACTIONS = 'getRoomsInfo';

const utils = {
    SLICE_AMOUNT: 25,

    isEnglish: val => /[\w]/.test(val),

    getMatrixHostName: domain => [matrixHost, domain].join('.'),

    parseRoom: ignoreUsers => ({ roomId, name: roomName, timeline }) => {
        const lastEvent = utils.getLastRealSenderEvent(timeline, ignoreUsers);
        if (!lastEvent) {
            return;
        }
        const timestamp = lastEvent.getTs();
        const date = lastEvent.getDate();

        return { roomName, roomId, timestamp, date };
    },

    isStopAction: action => action === STOP_ACTION,

    getOutdatedRooms: limit => ({ timestamp }) => timestamp < utils.getLimitTimestamp(limit),

    getActions: () => [LEAVE_ACTION, INVITE_ACTION, STOP_ACTION, SEND_ACTION, ALL_ROOMS_ACTIONS],

    getBaseUrl: domain => url.format({ protocol, hostname: utils.getMatrixHostName(domain) }),

    getUserId: (userName, domain) => `@${userName}:${utils.getMatrixHostName(domain)}`,

    getRoomsLastUpdate: (rooms, limit, ignoreUsers) =>
        rooms
            .map(utils.parseRoom(ignoreUsers))
            .filter(Boolean)
            .filter(utils.getOutdatedRooms(limit))
            .sort((el1, el2) => el2.timestamp - el1.timestamp),

    getLastRealSenderEvent: (events, ignoreUsers) =>
        events.reverse().find(ev => !(ignoreUsers || []).some(user => ev.getSender().includes(user))),

    getLimitTimestamp: limit =>
        moment()
            .subtract(limit, 'months')
            .valueOf(),
};

module.exports = utils;
