#!/usr/bin/env node

const {getOptions, getLimitMonths, getInputUsers} = require('./questions');
const {prompt, List} = require('enquirer');

const Service = require('../');
const {isLimit, getIgnoreUsers} = require('../utils');
const chalk = require('chalk');

const {log, clear} = console;
const defaultMonthsLimit = 6;

let service;
const run = async () => {
    const options = await getOptions();
    service = new Service(options);
    const client = await service.getClient();

    const monthsLimit = await getLimitMonths();
    const inputUsers = await getInputUsers();

    const rooms = await service.getRooms(monthsLimit, ignoreUsers);

    if (!rooms.length) {
        log(chalk.yellow('You don\'t have any room to leave'));
        return;
    }

    const ignoreUserMsg = ignoreUsers ? `of users (${ignoreUsers}) ` : '';
    const infoRoomMsg = `\nWe found ${rooms.length} rooms where last activity ${ignoreUserMsg}was ${monthsLimit} months ago\n`;
    log(chalk.green(infoRoomMsg));


};


const run = async () => {


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

try {
    run();
    log(chalk.green('\nAll work completed!!!'));
} catch (error) {
    log(chalk.yellow('Something wrong, please try again'));
} finally {
    service.stop();
    process.exit();
}
