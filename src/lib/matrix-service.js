const fs = require('fs').promises;
const matrixSdk = require('matrix-js-sdk');
const { ignoreUsers, getBaseUrl, getUserId, getRoomsLastUpdate, isEnglish, SLICE_AMOUNT } = require('./utils');
const Listr = require('listr');
const chalk = require('chalk');
const delay = require('delay');
const path = require('path');

const spinLoginText = 'login with password';
const spinSyncText = 'wait for sync with matrix server\n';

const formatName = name => name.split(':')[0].slice(1);

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
     * @param {any} data data to save
     * @param {string} name name alias
     * Save leaved to file
     */
    async saveToJson(data, name) {
        const fileName = `${name}_${Date.now()}.json`;
        const filePath = path.resolve(__dirname, fileName);
        await fs.writeFile(filePath, JSON.stringify(data), 'utf8');

        return filePath;
    }

    // /**
    //  * @param {array} rooms rooms
    //  * Save rooms to file
    //  */
    // async _saveRoomsToJson(rooms) {
    //     await this.saveToJson(rooms, 'rooms');
    // }

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
                    // await ctx.matrixClient.startClient({ initialSyncLimit: 1 });
                    await ctx.matrixClient.startClient({
                        initialSyncLimit: 20,
                        disablePresence: true,
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
     * @typedef {Object} Room
     * @property {string} project
     * @property {string} roomId
     * @property {string} roomName
     * @property {string[]} members
     * @property {{author: string, date: string}[]} message
     */

    /**
     * @return {Promise<{allRooms: Room[], singleRoomsManyMessages: Room[], singleRoomsNoMessages: Room[], manyMembersNoMessages: Room[], manyMembersManyMessages: Room[]}>} matrix rooms
     */
    async getAllRoomsInfo() {
        const matrixClient = this.client || (await this.getClient());
        const rooms = await matrixClient.getRooms();
        const parsedRooms = rooms.map(room => {
            const roomId = room.roomId;
            const roomName = room.name;
            const [issueName] = room.name.split(' ');
            const project = issueName.includes('-') ? issueName.split('-')[0] : 'custom project';
            const members = room.getJoinedMembers().map(item => formatName(item.userId));
            const messages = room.timeline
                .map(event => {
                    const author = formatName(event.getSender());
                    const type = event.getType();
                    const date = event.getDate();

                    return { author, type, date };
                })
                .filter(({ author, type }) => type === 'm.room.message' && !ignoreUsers.includes(author))
                .map(({ type, ...item }) => item);

            return {
                project,
                roomId,
                roomName,
                members,
                messages,
            };
        });

        const singleRoomsNoMessages = parsedRooms.filter(room => {
            return room.members.length === 1 && room.messages.length === 0;
        });

        const singleRoomsManyMessages = parsedRooms.filter(room => {
            return room.members.length === 1 && room.messages.length;
        });

        const manyMembersNoMessages = parsedRooms.filter(room => {
            return room.members.length > 1 && room.messages.length === 0;
        });

        const manyMembersManyMessages = parsedRooms.filter(room => {
            return room.members.length > 1 && room.messages.length;
        });
        // await this._saveRoomsToJson(parsedRooms);

        return {
            allRooms: parsedRooms,
            singleRoomsManyMessages,
            singleRoomsNoMessages,
            manyMembersNoMessages,
            manyMembersManyMessages,
        };
    }

    /**
     * @return {Promise<array>} matrix rooms
     */
    async noMessagesEmptyRooms() {
        const { singleRoomsNoMessages } = await this.getAllRoomsInfo();

        return singleRoomsNoMessages;
    }

    /**
     * @param {number|undefined} limit timestamp limit date
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
     * @param {{ roomId: string, roomName: string }[]} rooms matrix rooms from getRooms
     * @return {Promise<{leavedRooms: { roomId: string, roomName: string }[], errors: object[]}>} errors and leaved rooms empty array
     */
    async leaveRooms(rooms) {
        const leavedRooms = [];

        const iter = async (rooms = [], errors = []) => {
            if (!rooms.length) {
                return { errors, leavedRooms };
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
                        await client.leave(roomId);
                        leavedRooms.push({ roomId, roomName });
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

                return iter(restRooms, errors);
            } catch (err) {
                return iter(restRooms, [...errors, ...err.errors]);
            }
        };

        return iter(rooms);
    }

    /**
     *
     * @param {string} roomName
     */
    async getRoomByName(roomName) {
        const { allRooms } = await this.getAllRoomsInfo();

        return allRooms.filter(item => item.roomName.includes(roomName));
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
