const { take } = require('lodash');
const chalk = require('chalk');
const myLogger = require('./logger');
const { actions } = require('./utils');
// eslint-disable-next-line
const MatrixService = require('./matrix-service');
// eslint-disable-next-line
const Ask = require('./questions');

const DEFAULT_LIMIT = 6;

module.exports = class {
    /**
     * Service to work with input from console and matrix service
     * @param {MatrixService} matrixService service to work with matrix
     * @param {Ask} ask service to input data
     * @param {Console} logger logger myLogger by default
     */
    constructor(matrixService, ask, logger = myLogger) {
        this.matrixService = matrixService;
        this.ask = ask;
        this.logger = logger;
    }

    /**
     *
     * @param {object} roomData rooms data
     */
    _printRoomDate({ roomName, date }) {
        this.logger.log('\t-----------------------------------------------------');
        this.logger.log(chalk.blue('room name              '), chalk.yellow(roomName));
        if (date) {
            this.logger.log(chalk.blue('date of last activity  '), chalk.yellow(date));
        }
    }

    /**
     * Get rooms by user params and leave them
     */
    async [actions.leaveByDate]() {
        const limit = await this.ask.limitMonths(DEFAULT_LIMIT);
        const ignoreUsers = await this.ask.inputUsers();

        const rooms = await this.matrixService.getRooms(limit, ignoreUsers);

        if (!rooms.length) {
            this.logger.log(chalk.yellow("You don't have any room to leave"));
            return;
        }

        const ignoreMsg = ignoreUsers.length ? `of users (${ignoreUsers.join(', ')}) ` : '';
        const infoRoomMsg = `\nWe found ${rooms.length} rooms where last activity ${ignoreMsg}was ${limit} months ago\n`;
        this.logger.log(chalk.green(infoRoomMsg));

        (await this.ask.isShowRooms()) && rooms.map(this._printRoomDate.bind(this));

        if (await this.ask.isLeave()) {
            const { errors } = await this.matrixService.leaveRooms(rooms);
            errors.length && (await this.ask.isShowErrors()) && this.logger.error(errors);
            return errors;
        }
    }

    /**
     * Get rooms by user params and leave them
     */
    async [actions.leaveEmpty]() {
        const rooms = await this.matrixService.noMessagesEmptyRooms();

        this.logger.log(chalk.green(`\nWe found ${rooms.length} empty rooms\n`));
        this.logger.log(chalk.green(`\nNo more 200 will be handele!\n`));
        const first200 = take(rooms, 200);
        if (await this.ask.isShowRooms()) {
            first200.map(this._printRoomDate.bind(this));
        }

        if (await this.ask.isLeave()) {
            const { errors, leavedRooms } = await this.matrixService.leaveRooms(first200);
            errors.length && (await this.ask.isShowErrors()) && this.logger.error(errors);
            const isSave = await this.ask.isSaveLeavedToFile();
            if (isSave) {
                const pathToFile = await this.matrixService.saveToJson(leavedRooms, 'leaved');
                this.logger.log(chalk.blue('\nPath to file: '), chalk.yellow(pathToFile));
            }

            return errors;
        }
    }

    /**
     * Get all available rooms and invite selected user
     */
    async [actions.invite]() {
        const visibleRooms = await this.matrixService.getAllRoomsInfo();
        const inviteRooms = await this.ask.selectRoomsToInvite(visibleRooms);
        if (inviteRooms.length === 0) {
            return;
        }

        const knownUsers = await this.matrixService.getknownUsers();
        const userId = await this.ask.userToInvite(knownUsers);

        if (userId && (await this.ask.isInvite())) {
            const unInviteRooms = await this.matrixService.inviteUserToRooms(inviteRooms, userId);
            unInviteRooms && (await this.ask.isShowErrors()) && this.logger.error(unInviteRooms);
        }
    }

    /**
     *
     */
    async [actions.getRoomsInfo]() {
        const info = await this.matrixService.getAllRoomsInfo();

        Object.entries(info).map(([key, rooms]) => {
            this.logger.log(chalk.blue('\n' + key + ' is ' + rooms.length));
        });
    }

    /**
     *
     * @param {string?} room room name
     * @param {string?} optionalMessage message from command line
     */
    async [actions.send](room, optionalMessage) {
        const { allRooms } = await this.matrixService.getAllRoomsInfo();

        const rooms = room
            ? await this.matrixService.getRoomByName(room)
            : await this.ask.selectRoomsToInvite(allRooms);

        if (rooms.length === 0) {
            this.logger.warn('No room selected!');
            return;
        }

        const message = optionalMessage || (await this.ask.inputMessage());

        if (message) {
            const errors = await this.matrixService.sendMessage(rooms, message);
            if (errors) {
                optionalMessage
                    ? this.logger.error(errors)
                    : (await this.ask.isShowErrors()) && this.logger.error(errors);
            }
        }
    }

    /**
     *
     * @param {string} action action
     */
    async runAction(action) {
        console.log('TCL: runAction -> action', action);
        if (!this) {
            throw `Unknown action ${action}`();
        }

        await this[action]();
    }
};
