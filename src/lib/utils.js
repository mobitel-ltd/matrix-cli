const { last } = require('lodash');
const moment = require('moment');
const url = require('url');
require('dotenv').config();

const protocol = 'https';
const matrixHost = 'matrix';

const utils = {
    actions: {
        getIdByAlias: 'Get room id by room alias in your matrix domain if it is exists',
        leaveByDate: 'Leave rooms by special date of the last real user (not bot) event',
        invite: 'Invite user to some special room',
        stop: 'Stop and exit',
        send: 'Send message to a special room by name (alias)',
        getRoomsInfo: 'Get info about rooms (all rooms, single rooms and other)',
        leaveEmpty: 'Empty rooms with no messages from real user (for bot managment only)',
    },

    ignoreUsers: process.env.BOTS ? process.env.BOTS.split(' ') : [],

    SLICE_AMOUNT: 25,

    isEnglish: val => /[\w]/.test(val),

    getMatrixHostName: domain => [matrixHost, domain].join('.'),

    parseRoom: ignoreUsers => ({ roomId, name: roomName, timeline }) => {
        const lastEvent = ignoreUsers ? utils.getLastRealSenderEvent(timeline, ignoreUsers) : last(timeline);
        if (!lastEvent) {
            return;
        }
        const timestamp = lastEvent.getTs();
        const date = lastEvent.getDate();

        return { roomName, roomId, timestamp, date };
    },

    isStopAction: action => action === utils.actions.stop,

    getOutdatedRooms: limit => ({ timestamp }) => timestamp < utils.getLimitTimestamp(limit),

    getActions: () => Object.values(utils.actions),

    getBaseUrl: domain => url.format({ protocol, hostname: utils.getMatrixHostName(domain) }),

    getUserId: (userName, domain) => `@${userName}:${utils.getMatrixHostName(domain)}`,

    getMatrixAlias: (partAlias, domain) => `#${partAlias}:${utils.getMatrixHostName(domain)}`,

    getRoomsLastUpdate: (rooms, limit, ignoreUsers) =>
        rooms
            .map(utils.parseRoom(ignoreUsers))
            .filter(Boolean)
            .filter(utils.getOutdatedRooms(limit))
            .sort((el1, el2) => el2.timestamp - el1.timestamp),

    getLastRealSenderEvent: (events, ignoreUsers) =>
        events.reverse().find(ev => !(ignoreUsers || []).some(user => ev.getSender().includes(user))),

    getRealSenderMessages: (events, userId) =>
        events.reverse().find(ev => ev.getSender() !== userId && ev.getType() === 'm.room.message'),

    getLimitTimestamp: limit =>
        moment()
            .subtract(limit, 'months')
            .valueOf(),
};

module.exports = utils;
