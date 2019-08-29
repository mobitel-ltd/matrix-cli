const matrixSdk = require('matrix-js-sdk');
const { getBaseUrl, getUserId, getRoomsLastUpdate, isEnglish, SLICE_AMOUNT } = require('./utils');
const Listr = require('listr');
const chalk = require('chalk');
const delay = require('delay');

const spinLoginText = 'login with password';
const spinSyncText = 'wait for sync with matrix server\n';

module.exports = class {
    /**
     * @param {object} sdk sdk client
     */
    constructor({ sdk, domain, userName, password, sliceAmount, delayTime }) {
        this.sdk = sdk || matrixSdk;
        this.userName = userName;
        this.domain = domain;
        this.password = password;
        this.client;
        this.sliceAmount = sliceAmount || SLICE_AMOUNT;
        this.delayTime = delayTime || 500;
    }

    /**
     * @param {object} client matrix client
     * @return {Promise} promise with resolve after connection
     */
    _getReadyClient(client) {
        return new Promise((resolve, reject) => {
            client.on('sync', state => {
                if (state === 'SYNCING') {
                    resolve(client);
                }
            });
        });
    }

    /**
     * Get matrix sync client
     */
    async getClient() {
        const tasks = new Listr([
            {
                title: spinLoginText,
                task: async ctx => {
                    const baseUrl = getBaseUrl(this.domain);
                    const userId = getUserId(this.userName, this.domain);
                    const client = this.sdk.createClient(baseUrl);
                    const { access_token: accessToken } = await client.loginWithPassword(userId, this.password);
                    const matrixClient = this.sdk.createClient({
                        baseUrl,
                        accessToken,
                        userId,
                    });
                    ctx.matrixClient = matrixClient;
                },
            },
            {
                title: spinSyncText,
                task: async ctx => {
                    await ctx.matrixClient.startClient({
                        lazyLoadMembers: true,
                    });
                    const readyClient = await this._getReadyClient(ctx.matrixClient);
                    // eslint-disable-next-line
                    ctx.matrixClient = readyClient;
                },
            },
        ]);

        const { matrixClient } = await tasks.run();
        this.client = matrixClient;

        return matrixClient;
    }

    /**
     * @param {Object} room matrix room
     * @return {Boolean} return true if room is chat
     */
    _isChat(room) {
        const allMembers = room.currentState.getMembers();
        return allMembers.length < 3 && !isEnglish(room.name);
    }

    /**
     * @param {Object} room matrix room
     * @return {Boolean} is only user in romm
     */
    async _isSingle(room) {}

    /**
     * @return {Promise<{allRooms: array, singleRooms: array, doubleRooms: array}>} matrix rooms
     */
    async getAllRoomsInfo() {
        const matrixClient = this.client || (await this.getClient());
        const allRooms = await matrixClient.getRooms();
        const singleRooms = allRooms.filter(room => {
            const allMembers = room.currentState.getMembers();

            return allMembers.length < 2;
        });
        const doubleRooms = allRooms.filter(room => {
            const allMembers = room.currentState.getMembers();

            return allMembers.length === 2;
        });

        return { allRooms, singleRooms, doubleRooms };
    }

    /**
     * @param {number} limit timestamp limit date
     * @param {array|string|undefined} users users to ignore in events
     */
    async getRooms(limit, users = []) {
        const ignoreUsers = typeof users === 'string' ? [users] : users;
        const matrixClient = this.client || (await this.getClient());
        const rooms = await matrixClient.getRooms();
        const filteredRooms = rooms.filter(room => !this._isChat(room));

        return getRoomsLastUpdate(filteredRooms, limit, ignoreUsers);
    }

    /**
     * @param {array} rooms matrix rooms from getRooms
     * @param {array} errors errors from leaveRooms
     * @return {array} errors or empty array
     */
    async leaveRooms(rooms = [], errors = []) {
        if (!rooms.length) {
            return errors;
        }

        console.clear();
        const client = this.client || (await this.getClient());
        const roomsToHandle = rooms.slice(0, this.sliceAmount);
        const restRooms = rooms.slice(this.sliceAmount);
        try {
            const preparedTasks = roomsToHandle.map(({ roomId, roomName }) => {
                const title = `Leaving room ${roomName}`;
                const task = async () => {
                    await delay(this.delayTime);
                    return client.leave(roomId);
                };

                return {
                    title,
                    task,
                };
            });
            const tasks = new Listr(preparedTasks, {
                exitOnError: false,
            });

            await tasks.run();

            return this.leaveRooms(restRooms, errors);
        } catch (err) {
            return this.leaveRooms(restRooms, [...errors, ...err.errors]);
        }
    }

    /**
     * Get all rooms
     * @return {Promise<{roomId: string, roomName: string}[]>} array of rooms
     */
    async getVisibleRooms() {
        const client = this.client || (await this.getClient());
        const rooms = await client.getVisibleRooms();
        return rooms.map(({ roomId, name: roomName }) => ({
            roomId,
            roomName,
        }));
    }

    /**
     *
     * @param {string} roomName
     * @param {{roomId: string, roomName: string}[]} visibleRooms rooms for user
     */
    async getRoomByName(roomName, visibleRooms) {
        const rooms = visibleRooms || (await this.getVisibleRooms());

        return rooms.filter(item => item.roomName.includes(roomName));
    }

    /**
     *
     * @param {array} rooms matrix rooms of user
     * @param {string} userId matrix userId
     */
    async inviteUserToRooms(rooms, userId) {
        const client = this.client || (await this.getClient());
        // TEST ONLY
        // const [expectedRoom] = rooms;
        // const preparedTasks = [expectedRoom].map(({roomId, roomName}) => {
        try {
            const preparedTasks = rooms.map(({ roomId, roomName }) => {
                const title = `Inviting user ${chalk.cyan(userId)} to room ${chalk.cyan(roomName)}`;
                const task = () => client.invite(roomId, userId);

                return {
                    title,
                    task,
                };
            });
            const tasks = new Listr(preparedTasks, {
                concurrent: true,
                exitOnError: false,
            });

            await tasks.run();
        } catch (err) {
            return err.errors;
        }
    }

    /**
     * @param {string} name name matrix user
     */
    async getUser(name) {
        const client = this.client || (await this.getClient());
        const userId = getUserId(name, this.domain);

        return userId && client.getUser(userId);
    }

    /**
     */
    async getknownUsers() {
        const client = this.client || (await this.getClient());
        return client.getUsers();
    }

    /**
     * Send message
     * @param {array} rooms room id
     * @param {string} message message to send
     */
    async sendMessage(rooms, message) {
        const client = this.client || (await this.getClient());
        try {
            const preparedTasks = rooms.map(({ roomId, roomName }) => {
                const title = `Sending message ${chalk.cyan(message)} to room ${chalk.cyan(roomName)}`;
                const task = () => client.sendHtmlMessage(roomId, message, message);

                return {
                    title,
                    task,
                };
            });
            const tasks = new Listr(preparedTasks, {
                concurrent: true,
                exitOnError: false,
            });

            await tasks.run();
        } catch (err) {
            return err.errors;
        }
    }

    /**
     * Stop service
     */
    stop() {
        this.client && this.client.stopClient();
    }
};
