#!/usr/bin/env node

const readline = require('readline-sync');
const {getClient, leaveRooms, getRooms} = require('../');
const {isLimit} = require('../lib/utils');
const chalk = require('chalk');

const {log, clear} = console;
const defaultMonthsLimit = 6;

clear();
const domain = readline.question('What is your matrix domain?\n');
clear();
const userName = readline.question('What is your matrix name?\n');
clear();
const password = readline.question('What is your password?\n', {hideEchoBack: true});
clear();

const run = async (client) => {
    const monthsLimit = readline.questionInt(
        chalk.cyan('How many months ago from last activity in a room we should kick you? 6 months by default\n'),
        {defaultInput: defaultMonthsLimit, limit: isLimit, limitMessage: 'Input correct, please'}
    );

    const inputUsers = readline.question(
        // eslint-disable-next-line
        chalk.cyan('Input name of users which activities in rooms we ignore (comma or space separated). No users by default\n'),
    );
    const ignoreUsers = inputUsers && inputUsers.split(/[ ,]+/);

    const rooms = await getRooms(client, monthsLimit, ignoreUsers);

    const inoreUserMsg = ignoreUsers ? `of users (${ignoreUsers}) ` : '';
    const infoRoomMsg =
        `\nWe found ${rooms.length} rooms where last activity ${inoreUserMsg}was ${monthsLimit} months ago\n`;
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
        const roomsYouLeave = await leaveRooms(client, rooms);

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

getClient(domain, userName, password)
    .then(async (client) => {
        try {
            await run(client);
        } catch (error) {
            console.error(error);
        } finally {
            client.stopClient();
            log(chalk.green('\nAll work completed!!!'));
            process.exit();
        }
    })
    .catch(() => {
        log(chalk.yellow('Something wrong, please try again'));
    });
