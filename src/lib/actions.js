const utils = require('./utils');
const chalk = require('chalk');
const myLogger = require('./logger');

const DEFAULT_LIMIT = 6;

module.exports = class {
    /**
     * Service to work with input from console and matrix service
     * @param {object} matrixService service to work with matrix
     * @param {object} ask service to input data
     * @param {object} logger logger myLogger by default
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
        this.logger.log(chalk.blue('date of last activity  '), chalk.yellow(date));
    }

    /**
     * Get rooms by user params and leave them
     */
    async leave() {
        const limit = await this.ask.limitMonths(DEFAULT_LIMIT);
        const ignoreUsers = await this.ask.inputUsers();

        const rooms = await this.matrixService.getRooms(limit, ignoreUsers);

        if (!rooms.length) {
            this.logger.log(chalk.yellow("You don't have any room to leave"));
            return;
        }

        const ignoreMsg = ignoreUsers.length ? `of users (${ignoreUsers.join(', ')}) ` : '';
        const infoRoomMsg = `\nWe found ${
            rooms.length
        } rooms where last activity ${ignoreMsg}was ${limit} months ago\n`;
        this.logger.log(chalk.green(infoRoomMsg));

        (await this.ask.isShowRooms()) && rooms.map(this._printRoomDate.bind(this));

        if (await this.ask.isLeave()) {
            const unleavedRooms = await this.matrixService.leaveRooms(rooms);
            unleavedRooms && (await this.ask.isShowErrors()) && this.logger.error(unleavedRooms);
            return unleavedRooms;
        }
    }

    /**
     * Get all available rooms and invite selected user
     */
    async invite() {
        const visibleRooms = await this.matrixService.getVisibleRooms();
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
     * @param {string} action service action
     * @return {Boolean} Check if it's the end
     */
    isStopAction(action) {
        return action === utils.getStopAction();
    }
};
