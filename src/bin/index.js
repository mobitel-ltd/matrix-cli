#!/usr/bin/env node

const ask = require('../lib/questions');
const chalk = require('chalk');
const logger = require('../lib/logger');
const Service = require('../');

// TEST ONLY!!!
// const fakeSdk = require('../../__tests__/fixtures/fake-sdk');
require('dotenv').config();

// const options = {
//     domain: process.env.TEST_DOMAIN,
//     userName: process.env.TEST_USERNAME,
//     password: process.env.TEST_PASSWORD,
// //     sdk: fakeSdk,
// };


const printRoomDate = ({roomName, date}) => {
    logger.log('\t-----------------------------------------------------');
    logger.log(chalk.blue('room name              '), chalk.yellow(roomName));
    logger.log(chalk.blue('date of last activity  '), chalk.yellow(date));
};

const DEFAULT_LIMIT = 6;
let service;

const run = async () => {
    logger.clear();
    const options = await ask.options();

    service = new Service(options);
    await service.getClient();

    const limit = await ask.limitMonths(DEFAULT_LIMIT);
    const ignoreUsers = await ask.inputUsers();

    const rooms = await service.getRooms(limit, ignoreUsers);

    if (!rooms.length) {
        logger.log(chalk.yellow('You don\'t have any room to leave'));
        return;
    }

    const ignoreMsg = ignoreUsers.length ? `of users (${ignoreUsers.join(', ')}) ` : '';
    const infoRoomMsg = `\nWe found ${rooms.length} rooms where last activity ${ignoreMsg}was ${limit} months ago\n`;
    logger.log(chalk.green(infoRoomMsg));

    await ask.isShowRooms() && rooms.map(printRoomDate);

    if (await ask.isLeave()) {
        logger.clear();
        const unleavedRooms = await service.leaveRooms(rooms);
        unleavedRooms && await ask.isShowErrors() && logger.error(unleavedRooms);
    }

    if (await ask.isShowVisibles()) {
        logger.clear();
        const visibleRooms = await service.getVisibleRooms();
        const inviteRooms = await ask.selectRoomsToInvite(visibleRooms);
        if (inviteRooms.length === 0) {
            return;
        }

        const knownUsers = await service.getknownUsers();
        const userId = await ask.userToInvite(knownUsers);

        if (userId && await ask.isInvite()) {
            const unInviteRooms = await service.inviteUserToRooms(inviteRooms, userId);
            unInviteRooms && await ask.isShowErrors() && logger.error(unInviteRooms);
        }
    }
};

run()
    .then(() => logger.log(chalk.green('\nAll work completed!!!')))
    .catch((err) => {
        logger.log(chalk.yellow('Something wrong, please try again'));
        logger.error(err);
    })
    .finally(() => {
        service && service.stop();
        process.exit();
    });
