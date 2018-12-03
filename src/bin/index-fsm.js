const chalk = require('chalk');
const StateMachine = require('fsm-as-promised');
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
let service;

const fsm = new StateMachine({
    initial: 'begin',
    final: 'end',
    events: [
        {name: 'start', from: 'begin', to: 'actions'},
        {name: 'leave', from: 'actions', to: 'startleave'},
        {name: 'stop', from: 'actions', to: 'end'},
        {name: 'invite', from: 'actions', to: 'startinvite'},
        {name: 'actionsAgain', from: ['leave', 'invite'], to: 'actions'},
    ],
    callbacks: {
        onenterend: () => logger.log(chalk.green('\nAll work completed!!!')),
        onstart: async (state) => {
            const options = await ask.options();

            const service = new Service({...options, sdk: fakeSdk});
            await service.getClient();
            state.service = service;
        },
        onenteredactions: async (state) => {
            const action = await ask.selectAction();
            return fsm[action]();
        },
        onenterstartleave: async (state) => {
            const limit = await ask.limitMonths(DEFAULT_LIMIT);
            const ignoreUsers = await ask.inputUsers();
            console.log(state);
            const rooms = await state.service.getRooms(limit, ignoreUsers);

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
                const unleavedRooms = await state.service.leaveRooms(rooms);
                unleavedRooms && await ask.isShowErrors() && logger.error(unleavedRooms);
            }

            return fsm.actionsAgain();
        },
        onenterstartinvite: async (state) => {
            logger.clear();
            const visibleRooms = await state.service.getVisibleRooms();
            const inviteRooms = await ask.selectRoomsToInvite(visibleRooms);
            if (inviteRooms.length === 0) {
                logger.log(chalk.yellow('You don\'t have any room to invite'));

                return fsm.actionsAgain();
            }

            const knownUsers = await state.service.getknownUsers();
            const userId = await ask.userToInvite(knownUsers);

            if (userId && await ask.isInvite()) {
                const unInviteRooms = await state.service.inviteUserToRooms(inviteRooms, userId);
                unInviteRooms && await ask.isShowErrors() && logger.error(unInviteRooms);
            }

            return fsm.actionsAgain();
        },
    },
}, {service});

// logger.log(fsm.current);
fsm.start()
    // .then(() => fsm.select)
    .catch((err) => {
        logger.log(chalk.yellow('Something wrong, please try again'));
        logger.error(err);
    })
    .finally(() => {
        service && service.stop();
        process.exit();
    });
