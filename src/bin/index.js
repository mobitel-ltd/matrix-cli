#!/usr/bin/env node

const readline = require('readline-sync');
const {getClient, leaveRooms, getRooms} = require('../lib');
const {isLimit} = require('../lib/utils');

const defaultInput = 6;

const domain = readline.question('What is your matrix domain?\n');
const userName = readline.question('What is your matrix name?\n');
const password = readline.question('What is your password?\n', {hideEchoBack: true});
getClient(domain, userName, password)
    .then(async (client) => {
        const monthsLimit = readline.questionInt(
            'How many months ago from last activity in a room we should kick you? 6 months by default\n',
            {defaultInput, limit: isLimit, limitMessage: 'Input correct, please'}
        );

        const rooms = await getRooms(client, monthsLimit);
        console.log('We found %s rooms are outdated', rooms.length);
        const isShowName = readline.keyInYN('Do you want to see them?\n');

        if (isShowName) {
            rooms.map(({roomName, date}) => {
                console.log('\t-----------------------------------------------------');
                console.log('room name "%s"', roomName, '\ndate of last activity', date);
            });
        }

        const isStart = readline.keyInYN('\nAre you sure? You will leave them all\n');
        if (isStart) {
            await leaveRooms(client, rooms);
        }
        client.stopClient();
        process.exit();
    });
