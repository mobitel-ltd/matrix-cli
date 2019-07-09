#!/usr/bin/env node

const program = require('commander');
const Service = require('../lib/matrix-service');
const Actions = require('../lib/actions');
require('dotenv').config();

const baseOptions = {
    domain: process.env.DOMAIN,
    userName: process.env.USERNAME,
    password: process.env.PASSWORD,
};

program
    .option('-d, --domain <name>', 'input matrix domain', baseOptions.domain)
    .option('-u, --username <name>', 'input matrix username', baseOptions.userName)
    .option('-p, --password <name>', 'input matrix user password', baseOptions.password)
    .option('-r, --roomname <name>', 'input matrix room name')
    .option('-m, --message <name>', 'input message')
    .action(() => {
        if (!program.roomname) {
            console.warn('Input roomName!!!');
            process.exit();
        }
        if (!program.message) {
            console.warn('Input message!!!');
            process.exit();
        }

        const options = {
            domain: program.domain,
            userName: program.username,
            password: program.password,
        };
        const service = new Service(options);

        service
            .getClient()
            .then(() => {
                const actions = new Actions(service);
                return actions.send(program.roomname, program.message);
            })
            .then(() => console.log('All done'))
            .catch(console.error)
            .finally(() => {
                service && service.stop();
                process.exit();
            });
    })
    .parse(process.argv);
