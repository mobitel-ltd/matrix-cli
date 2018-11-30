const matrixSdk = require('matrix-js-sdk');
const {getBaseUrl, getUserId, getRoomsLastUpdate} = require('./utils');
const Listr = require('listr');

const spinLoginText = 'login with password';
const spinSyncText = 'wait for sync with matrix server\n';

module.exports = class {
    /**
     * @param {object} sdk sdk client
     */
    constructor({sdk, domain, userName, password}) {
        this.sdk = sdk || matrixSdk;
        this.userName = userName;
        this.domain = domain;
        this.password = password;
        this.client;
    }

    /**
     * @param {object} client matrix client
     * @return {Promise} promise with resolve after connection
     */
    _getReadyClient(client) {
        return new Promise((resolve, reject) => {
            client.on('sync', (state) => {
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
                task: async (ctx) => {
                    const baseUrl = getBaseUrl(this.domain);
                    const userId = getUserId(this.userName, this.domain);
                    const client = this.sdk.createClient(baseUrl);
                    const {access_token: accessToken} = await client.loginWithPassword(userId, this.password);
                    const matrixClient = this.sdk.createClient({baseUrl, accessToken, userId});
                    ctx.matrixClient = matrixClient;
                },
            },
            {
                title: spinSyncText,
                task: async (ctx) => {
                    await ctx.matrixClient.startClient({lazyLoadMembers: true});
                    const readyClient = await this._getReadyClient(ctx.matrixClient);
                    ctx.matrixClient = readyClient;
                },
            },
        ]);

        const {matrixClient} = await tasks.run();
        this.client = matrixClient;

        return matrixClient;
    }

    /**
     * @param {number} limit timestamp limit date
     * @param {array|string|undefined} users users to ignore in events
     */
    async getRooms(limit, users = []) {
        const ignoreUsers = typeof users === 'string' ? [users] : users;
        const matrixClient = this.client || await this.getClient();
        const rooms = await matrixClient.getRooms();
        return getRoomsLastUpdate(rooms, limit, ignoreUsers);
    }


    /**
     * @param {array} rooms matrix rooms from getRooms
     */
    async leaveRooms(rooms = []) {
        const client = this.client || await this.getClient();
        // TEST ONLY
        // const [expectedRoom] = rooms;
        try {
            const preparedTasks = rooms.map(({roomId, roomName}) => {
                const title = `Leaving room ${roomName}`;
                const task = () => client.leave(roomId);

                return {title, task};
            });
            const tasks = new Listr(preparedTasks, {concurrent: true, exitOnError: false});

            await tasks.run();
        } catch (err) {
            return err.errors;
        }
    }

    /**
     * Get all rooms
     */
    async getVisibleRooms() {
        const client = this.client || await this.getClient();
        const rooms = await client.getVisibleRooms();
        return rooms.map(({roomId, name: roomName}) => ({roomId, roomName}));
    }

    /**
     *
     * @param {array} rooms matrix rooms of user
     * @param {string} userId matrix userId
     */
    async inviteUserToRooms(rooms, userId) {
        const client = this.client || await this.getClient();
        // TEST ONLY
        const [expectedRoom] = rooms;
        try {
            const preparedTasks = [expectedRoom].map(({roomId, roomName}) => {
                // const preparedTasks = rooms.map(({roomId, roomName}) => {
                const title = `Inviting user ${userId} to room ${roomName}`;
                const task = () => client.invite(roomId, userId);

                return {title, task};
            });
            const tasks = new Listr(preparedTasks, {concurrent: true, exitOnError: false});

            await tasks.run();
        } catch (err) {
            return err.errors;
        }
    }

    /**
     * @param {string} name name matrix user
     */
    async getUser(name) {
        const client = this.client || await this.getClient();
        const userId = getUserId(name, this.domain);

        return await client.getUser(userId) && userId;
    }
    /**
     * Stop service
     */
    stop() {
        this.client && this.client.stopClient();
    }
};
