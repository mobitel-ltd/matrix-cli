const { last, pipe, pick } = require('lodash/fp');
const moment = require('moment');

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
        'Delete room alias': 'deleteAlias',
    },

    isEnglish: val => /[\w]/.test(val),

    isStopAction: action => action === stopAction,

    getActions: () => Object.keys(utils.actions),

    getMethod: action => utils.actions[action],

    getOutdatedRooms: (rooms, limit, ignoreUsers) =>
        rooms
            .filter(room => room.lastMessageDate.timestamp < utils.getLimitTimestamp(limit))
            .sort((el1, el2) => el2.lastMessageDate.timestamp - el1.lastMessageDate.timestamp),

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
     * @param {string[]} ignoreUsers ignore users
     * @param {Room} room matrix room
     * @return {{project: string, roomId: string, roomName: string, members: string[], messages: {author: string, date: string}[]}} parsed rooms
     */
    getParsedRooms: (ignoreUsers = []) => room => {
        const roomId = room.roomId;
        const roomName = room.name;
        const [issueName] = room.name.split(' ');
        const project = issueName.includes('-') ? issueName.split('-')[0] : 'custom project';
        const members = room.getJoinedMembers().map(item => utils.formatName(item.userId));
        const allMessages = room.timeline
            .map(event => {
                const author = utils.formatName(event.getSender());
                const type = event.getType();
                const date = event.getDate();
                const timestamp = event.getTs();
                const content = utils.isMessageEvent(type) && event.getContent();
                const body = content.msgtype === 'm.text' && content.body;

                return { author, type, date, body, timestamp };
            })
            .filter(({ type }) => utils.isMessageEvent(type));

        const realUsersNotCommandMessages = allMessages
            .filter(({ author, body }) => !ignoreUsers.includes(author) && !utils.isCommandMessage(body))
            .map(({ author, date }) => ({ author, date }));

        const lastMessageDate = pipe(
            last,
            pick(['date', 'timestamp']),
        )(allMessages);

        return {
            project,
            roomId,
            roomName,
            members,
            lastMessageDate,
            messages: realUsersNotCommandMessages,
        };
    },
};

module.exports = utils;
