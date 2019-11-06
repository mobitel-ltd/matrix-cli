const { last } = require('lodash');
const moment = require('moment');
const url = require('url');
const path = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
require('dotenv').config({ path });

const protocol = 'https';
const matrixHost = 'matrix';

const messageEventType = 'm.room.message';

const stopAction = 'stop';

const commands = ['!help', '!invite', '!spec', '!move', '!prio', '!assign'];

const utils = {
    formatName: name => name.split(':')[0].slice(1),

    actions: {
        'Get info about rooms (all rooms, single rooms and other)': 'getRoomsInfo',
        'Leave rooms by special date of the last real user (not bot) event': 'leaveByDate',
        'Leave empty rooms with no messages from real user (for bot managment only)': 'leaveEmpty',
        'Leave by room member': 'leaveByMember',
        'Get room id by room alias in your matrix domain if it is exists': 'getIdByAlias',
        'Invite user to some special rooms': 'invite',
        'Send message to a special room by name (alias)': 'send',
        'Join to all invited rooms': 'join',
        'Set power level 100 to selected rooms': 'setPower',
        'Stop and exit': stopAction,
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

    isStopAction: action => action === stopAction,

    getOutdatedRooms: limit => ({ timestamp }) => timestamp < utils.getLimitTimestamp(limit),

    getActions: () => Object.keys(utils.actions),

    getMethod: action => utils.actions[action],

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

    timing: (startTime, now = Date.now()) => {
        const timeSync = Math.floor((now - startTime) / 1000);
        const min = Math.floor(timeSync / 60);
        const sec = timeSync % 60;
        return { min, sec };
    },

    isCommandMessage: msg => msg && commands.some(item => msg.includes(item)),

    isMessageEvent: type => type === messageEventType,

    /**
     * Parse matrix room data
     * @param {Room} room matrix room
     * @return {{project: string, roomId: string, roomName: string, members: string[], messages: {author: string, date: string}[]}} parsed rooms
     */
    getParsedRooms: room => {
        const roomId = room.roomId;
        const roomName = room.name;
        const [issueName] = room.name.split(' ');
        const project = issueName.includes('-') ? issueName.split('-')[0] : 'custom project';
        const members = room.getJoinedMembers().map(item => utils.formatName(item.userId));
        const messages = room.timeline
            .map(event => {
                const author = utils.formatName(event.getSender());
                const type = event.getType();
                const date = event.getDate();
                const content = utils.isMessageEvent(type) && event.getContent();
                const body = content.msgtype === 'm.text' && content.body;

                return { author, type, date, body };
            })
            .filter(
                ({ author, type, body }) =>
                    utils.isMessageEvent(type) && !utils.ignoreUsers.includes(author) && !utils.isCommandMessage(body),
            )
            .map(({ type, body, ...item }) => item);

        return {
            project,
            roomId,
            roomName,
            members,
            messages,
        };
    },
};

module.exports = utils;
