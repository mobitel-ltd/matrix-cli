const { formatName } = require('./utils');
const chalk = require('chalk');
const myLogger = require('./logger');
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
     * Leave room recursive method
     * @param {Room[]} rooms
     * @param {{deleteAlias: boolean}} [options]
     * @return {Promise<{errors: Error[], leavedRooms: Room[], errLeavedRooms: Room[]} | undefined>} errors and leaved rooms
     */
    async _runLeaving(rooms, options) {
        const res = await this.matrixService.leaveRooms(rooms, options);
        const { errors, leavedRooms, errLeavedRooms } = res;
        leavedRooms.length && this.logger.log(chalk.green(`\nYou have leaved ${leavedRooms.length} rooms!!!\n`));

        errLeavedRooms.length &&
            this.logger.log(chalk.green(`\nYou couldn't leave ${errLeavedRooms.length} rooms!!!\n`));

        errors.length && (await this.ask.isShowErrors()) && this.logger.error(errors);

        const isSave = await this.ask.isSaveLeavedToFile();
        if (isSave) {
            const pathToFile = await this.matrixService.saveToJson(leavedRooms, 'leaved');
            this.logger.log(chalk.blue('\nPath to file: '), chalk.yellow(pathToFile));
        }

        return errLeavedRooms.length && (await this.ask.tryAgainForErrors()) ? this._runLeaving(errLeavedRooms) : res;
    }

    /**
     * Get rooms by user params and leave them
     * @return {Promise<{errors: Error[], leavedRooms: Room[], errLeavedRooms: Room[]} | undefined>} errors and leaved rooms
     */
    async leaveByDate() {
        const limit = await this.ask.limitMonths(DEFAULT_LIMIT);

        const rooms = await this.matrixService.getRooms(limit);

        if (!rooms.length) {
            this.logger.log(chalk.yellow("You don't have any room to leave"));
            return;
        }

        const ignoreMsg = this.matrixService.ignoreUsers.length
            ? `of users (${this.matrixService.ignoreUsers.join(', ')}) `
            : '';
        const infoRoomMsg = `\nWe found ${rooms.length} rooms where last activity ${ignoreMsg}was ${limit} months ago\n`;
        this.logger.log(chalk.green(infoRoomMsg));

        const selectedRooms = await this.ask.selectRooms(rooms);

        if (selectedRooms.length) {
            (await this.ask.isShowRooms()) &&
                selectedRooms.map(room =>
                    this._printRoomDate({ roomName: room.roomName, date: room.lastMessageDate.date }),
                );

            if (await this.ask.isLeave()) {
                return this._runLeaving(selectedRooms);
            }
        }
    }

    /**
     * Get rooms by user params and leave them
     * @return {Promise<{errors: Error[], leavedRooms: Room[], errLeavedRooms: Room[]} | undefined>} errors and leaved rooms
     */
    async leaveEmpty() {
        const rooms = await this.matrixService.noMessagesEmptyRooms();
        if (!rooms.length) {
            this.logger.log(chalk.green('\nWe dont found empty rooms with no messages\n'));
            return;
        }

        this.logger.log(chalk.green(`\nWe found ${rooms.length} empty rooms\n`));
        const selectedRooms = await this.ask.selectRooms(rooms);

        if (selectedRooms.length && (await this.ask.isLeave())) {
            return this._runLeaving(selectedRooms, { deleteAlias: true });
        }
    }

    /**
     * Leave all rooms where some user exists
     * @return {Promise<{errors: array, leavedRooms: Rooms[], errLeavedRooms: Rooms[]}>} result of invite
     */
    async leaveByMember() {
        const matrixUser = await this._selectUser();

        if (!matrixUser) {
            this.logger.log(chalk.yellow('\nNo user selected!!!\n'));
            return;
        }

        const userId = formatName(matrixUser);
        const { allRooms } = await this.matrixService.getAllRoomsInfo();

        const memberRooms = allRooms.filter(room => {
            return room.members.includes(userId);
        });
        if (!memberRooms.length) {
            this.logger.log(chalk.yellow(`\nNo room with user ${userId} is found\n`));
            return;
        }

        this.logger.log(chalk.green(`\nWe found ${memberRooms.length} with joined member ${userId}\n`));
        const selectedRooms = await this.ask.selectRooms(memberRooms);

        if (selectedRooms.length && (await this.ask.isLeave())) {
            return this._runLeaving(selectedRooms);
        }
    }

    /**
     * Join to room from list
     * @return {Promise<{errors: Error[], joinedRooms: []}>} result of invite
     */
    async join() {
        const { allRooms } = await this.matrixService.getAllRoomsInfo();
        const notJoinedRooms = allRooms.filter(room => !room.members.includes(this.matrixService.userName));
        if (notJoinedRooms.length === 0) {
            this.logger.log(chalk.yellow(`\nAll rooms, where you are invited, you have alredy joned!\n`));
            return;
        }
        this.logger.log(chalk.green(`\nWe found ${notJoinedRooms.length} rooms you are invited but not joined\n`));

        const iter = async rooms => {
            const res = await this.matrixService.join(rooms);
            const { joinedRooms, errors, errJoinedRooms } = res;
            const isSave = await this.ask.isSaveLeavedToFile();

            joinedRooms.length && this.logger.log(chalk.green(`\nYou have joined to ${joinedRooms.length} rooms!!!\n`));

            errJoinedRooms.length &&
                this.logger.log(chalk.green(`\nYou couldn't join to ${errJoinedRooms.length} rooms!!!\n`));

            errors.length && (await this.ask.isShowErrors()) && this.logger.error(errors);

            if (isSave) {
                const pathToFile = await this.matrixService.saveToJson(joinedRooms, 'joined');
                this.logger.log(chalk.blue('\nPath to file: '), chalk.yellow(pathToFile));
            }

            return errJoinedRooms.length && (await this.ask.tryAgainForErrors()) ? iter(errJoinedRooms) : res;
        };

        if (await this.ask.isJoin()) {
            return iter(notJoinedRooms);
        }
    }

    /**
     * Select user from existing or print name
     * @return {string} user id
     */
    async _selectUser() {
        const selectWays = {
            existing: async () => {
                const knownUsers = await this.matrixService.getknownUsers();
                return this.ask.selectUser(knownUsers);
            },
            print: async () => {
                const user = await this.ask.inputOne();

                return user && this.matrixService.getUserId(user);
            },
        };
        const userStrategy = await this.ask.selectUserStrategy();

        return selectWays[userStrategy]();
    }

    /**
     * Get all available rooms and invite selected user
     * @return {Promise<{userId: string, errors: array, invitedRooms: []}>} result of invite
     */
    async setPower() {
        const userId = await this._selectUser();

        if (!userId) {
            this.logger.log(chalk.yellow('\nNo user is selected\n'));
            return;
        }

        const roomsInfo = await this.matrixService.getAllRoomsInfo();
        const strategy = await this.ask.selectStrategy();
        const userMemberRooms = roomsInfo[strategy].filter(room => room.members.includes(formatName(userId)));
        if (userMemberRooms.length === 0) {
            this.logger.log(chalk.yellow(`\nIn group ${strategy} no rooms with ${userId} found\n`));
            return;
        }
        const poweredRooms = await this.ask.selectRooms(userMemberRooms);
        if (poweredRooms.length === 0) {
            this.logger.log(chalk.yellow(`\nIn group ${strategy} no rooms found\n`));
            return;
        }

        const iter = async rooms => {
            const res = await this.matrixService.setPower(rooms, userId);
            const { poweredRooms, errPoweredRooms, errors } = res;
            const isSave = await this.ask.isSaveLeavedToFile();

            poweredRooms.length &&
                this.logger.log(chalk.green(`\nYou have set power to ${poweredRooms.length} rooms!!!\n`));

            errPoweredRooms.length &&
                this.logger.log(chalk.green(`\nYou couldn't set power to ${errPoweredRooms.length} rooms!!!\n`));

            errors.length && (await this.ask.isShowErrors()) && this.logger.error(errors);

            if (isSave) {
                const pathToFile = await this.matrixService.saveToJson(poweredRooms, 'powered');
                this.logger.log(chalk.blue('\nPath to file: '), chalk.yellow(pathToFile));
            }

            return errPoweredRooms.length && (await this.ask.tryAgainForErrors()) ? iter(errPoweredRooms) : res;
        };

        if (await this.ask.isPowered()) {
            return iter(poweredRooms);
        }
    }

    /**
     * Get all available rooms and invite selected user
     * @return {Promise<{userId: string, errors: array, invitedRooms: []}>} result of invite
     */
    async invite() {
        const rooms = await this.matrixService.getAllRoomsInfo();
        const strategy = await this.ask.selectStrategy();
        const inviteRooms = await this.ask.selectRooms(rooms[strategy]);
        if (inviteRooms.length === 0) {
            this.logger.log(chalk.yellow(`\nIn group ${strategy} no rooms found\n`));
            return;
        }

        const userId = await this._selectUser();

        if (!userId) {
            this.logger.log(chalk.yellow('\nNo user is selected\n'));
            return;
        }

        if (await this.ask.isInvite()) {
            const { errors, invitedRooms, errInvitedRooms } = await this.matrixService.inviteUserToRooms(
                inviteRooms,
                userId,
            );
            errors.length && (await this.ask.isShowErrors()) && this.logger.error(errors);
            const isSave = await this.ask.isSaveLeavedToFile();
            if (isSave) {
                const pathToFile = await this.matrixService.saveToJson(invitedRooms, 'invited');
                this.logger.log(chalk.blue('\nPath to file: '), chalk.yellow(pathToFile));
            }

            return { errors, invitedRooms, invitedUser: userId, errInvitedRooms };
        }
    }

    /**
     * @return {Promise<{allRooms: Room[], singleRoomsManyMessages: Room[], singleRoomsNoMessages: Room[], manyMembersNoMessages: Room[], manyMembersManyMessages: Room[]}>} matrix rooms
     */
    async getRoomsInfo() {
        const info = await this.matrixService.getAllRoomsInfo();

        Object.entries(info).map(([key, rooms]) => {
            this.logger.log(chalk.blue('\n' + key + ' is ' + rooms.length));
        });
        const isSave = await this.ask.isSaveLeavedToFile();
        if (isSave) {
            const pathToFile = await this.matrixService.saveToJson(info, 'info');
            this.logger.log(chalk.blue('\nPath to file: '), chalk.yellow(pathToFile));
        }

        return info;
    }

    /**
     *
     * @param {string?} room room name
     * @param {string?} optionalMessage message from command line
     */
    async send(room, optionalMessage) {
        const { allRooms } = await this.matrixService.getAllRoomsInfo();

        const rooms = room ? await this.matrixService.getRoomByName(room) : await this.ask.selectRooms(allRooms);

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
     * Get room id by alias
     * @return {string?} roomId
     */
    async getIdByAlias() {
        const alias = await this.ask.inputRoomAlias();
        if (!alias) {
            return;
        }

        const roomId = await this.matrixService.getRoomByAlias(alias);
        const msg = roomId ? roomId : `not found`;
        this.logger.log(chalk.blue(`\nMatrix id for room with alias ${alias} is ${msg}\n`));

        return roomId;
    }

    /**
     * Delete analias form matrix
     */
    async deleteAlias() {
        const aliasPart = await this.ask.inputRoomAlias();
        if (!aliasPart) {
            return;
        }

        const roomId = await this.matrixService.getRoomByAlias(aliasPart);

        if (roomId) {
            this.logger.log(chalk.blue(`\nMatrix id for room with alias ${aliasPart} is ${roomId}\n`));

            if (await this.ask.isDeleteAlias()) {
                await this.matrixService.deleteAlias(aliasPart);

                this.logger.log(chalk.green(`\nAlias ${aliasPart} for room ${roomId} is successfully deleted!!!\n`));

                return roomId;
            }

            return;
        }

        this.logger.log(chalk.yellow(`\nMatrix id for room with alias ${aliasPart} is not found\n`));
    }
};
