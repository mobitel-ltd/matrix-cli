const chalk = require('chalk');
const {Machine: machine} = require('xstate');
const {interpret} = require('xstate/lib/interpreter');
const ask = require('../lib/questions');
const logger = require('../lib/logger');
const Service = require('../');
// TEST ONLY!!!
const fakeSdk = require('../../__tests__/fixtures/fake-sdk');

const printRoomDate = ({roomName, date}) => {
    logger.log('\t-----------------------------------------------------');
    logger.log(chalk.blue('room name              '), chalk.yellow(roomName));
    logger.log(chalk.blue('date of last activity  '), chalk.yellow(date));
};

const DEFAULT_LIMIT = 6;

const fsm = machine({
    initial: 'begin',
    context: {
        service: null,
    },
    states: {
        begin: {
            onEntry: 'startMatrixClient',
            onDone: {
                target: 'select',
            },
        },
        select: {
            onEntry: 'selectAction',
        },
        end: {
            type: 'final',
        },
    },
}, {
    actions: {
        selectAction: async () => {
            const action = await ask.selectAction();
        },
        startMatrixClient: async (ctx) => {
            const options = await ask.options();
            const service = new Service({...options, sdk: fakeSdk});
            await service.getClient();
            ctx.service = service;
        },
        leave: async (ctx) => {
            const limit = await ask.limitMonths(DEFAULT_LIMIT);
            const ignoreUsers = await ask.inputUsers();
            const rooms = await ctx.service.getRooms(limit, ignoreUsers);

            if (!rooms.length) {
                logger.log(chalk.yellow('You don\'t have any room to leave'));
                return fsm.actionsAgain();
            }

            const ignoreMsg = ignoreUsers.length ? `of users (${ignoreUsers.join(', ')}) ` : '';
            const infoRoomMsg =
                `\nWe found ${rooms.length} rooms where last activity ${ignoreMsg}was ${limit} months ago\n`;
            logger.log(chalk.green(infoRoomMsg));

            await ask.isShowRooms() && rooms.map(printRoomDate);

            if (await ask.isLeave()) {
                logger.clear();
                const unleavedRooms = await ctx.service.leaveRooms(rooms);
                unleavedRooms && await ask.isShowErrors() && logger.error(unleavedRooms);
            }
            return fsm.actionsAgain(ctx.service);
        },
        invite: async (ctx) => {
            logger.clear();
            const visibleRooms = await ctx.service.getVisibleRooms();
            const inviteRooms = await ask.selectRoomsToInvite(visibleRooms);
            if (inviteRooms.length === 0) {
                logger.log(chalk.yellow('You don\'t have any room to invite'));

                return fsm.actionsAgain();
            }

            const knownUsers = await ctx.service.getknownUsers();
            const userId = await ask.userToInvite(knownUsers);

            if (userId && await ask.isInvite()) {
                const unInviteRooms = await ctx.service.inviteUserToRooms(inviteRooms, userId);
                unInviteRooms && await ask.isShowErrors() && logger.error(unInviteRooms);
            }

            return fsm.actionsAgain();
        },
    },
});

const service = interpret(fsm);
service.start();
// .then(() => logger.log(chalk.green('\nAll work completed!!!')))
// .catch((err) => {
//     logger.warn('Something wrong, please try again');
//     logger.error(err);
// })
// .finally(() => {
//     service && service.stop();
//     process.exit();
// });
