#!/usr/bin/env node

const readline = require('readline-sync');
const Service = require('../');
const {isLimit, getIgnoreUsers} = require('../utils');
const chalk = require('chalk');
require('dotenv').config();

const {log, clear} = console;
const defaultMonthsLimit = 6;

const options = {
    domain: process.env.TEST_DOMAIN,
    userName: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD,
};

// clear();
// const domain = readline.question('What is your matrix domain?\n');
// clear();
// const userName = readline.question('What is your matrix name?\n');
// clear();
// const password = readline.question('What is your password?\n', {hideEchoBack: true});
// clear();

// const service = new Service({userName, domain, password});
const service = new Service(options);
const run = async () => {
    const monthsLimit = readline.questionInt(
        chalk.cyan('How many months ago from last activity in a room we should kick you? 6 months by default\n'),
        {defaultInput: defaultMonthsLimit, limit: isLimit, limitMessage: 'Input correct, please'}
    );

    const inputUsers = readline.question(
        // eslint-disable-next-line
        chalk.cyan('Input name of users which activities in rooms we ignore (comma or space separated). No users by default\n'),
    );
    const ignoreUsers = getIgnoreUsers(inputUsers);
    const rooms = await service.getRooms(monthsLimit, ignoreUsers);

    if (!rooms.length) {
        log(chalk.yellow('You don\'t have any room to leave'));
        return;
    }
    const ignoreUserMsg = ignoreUsers ? `of users (${ignoreUsers}) ` : '';
    const infoRoomMsg =
        `\nWe found ${rooms.length} rooms where last activity ${ignoreUserMsg}was ${monthsLimit} months ago\n`;
    log(chalk.green(infoRoomMsg));

    const isShowName = readline.keyInYN(chalk.cyan('Do you want to see them?'));

    if (isShowName) {
        rooms.map(({roomName, date}) => {
            log('\t-----------------------------------------------------');
            log(chalk.blue('room name              '), chalk.yellow(roomName));
            log(chalk.blue('date of last activity  '), chalk.yellow(date));
        });
    }

    const isStart = readline.keyInYN(chalk.cyan('\nLeave them all?'));
    if (isStart) {
        const roomsYouLeave = await service.leaveRooms(rooms);

        clear();
        const errorRooms = roomsYouLeave
            .map((data) => {
                log('\t--------------------------------------------');
                log(chalk.blue('room name              '), chalk.cyan(data.name));
                if (data.error) {
                    log(chalk.blue('result                 '), chalk.red('Some error when leaving'));
                    return data;
                }
                log(chalk.blue('result                 '), chalk.green('Room successfully leaved'));
                return;
            })
            .filter(Boolean);
        log('\t--------------------------------------------');

        if (errorRooms.length) {
            const isPrintErrors = readline.keyInYN('You have some errors while leaving rooms, to print errors put "y"');
            if (isPrintErrors) {
                errorRooms.map((data) => {
                    log(data);
                });
            }
        }
    }
};


service.getClient()
    .then(async (client) => {
        try {
            await run(client);
        } catch (error) {
            console.error(error);
        } finally {
            service.stop();
            log(chalk.green('\nAll work completed!!!'));
            process.exit();
        }
    })
    .catch(() => {
        service.stop();
        log(chalk.yellow('Something wrong, please try again'));
        process.exit();
    });
