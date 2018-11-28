const ora = require('ora');
const {getBaseUrl, getUserId, getRoomsLastUpdate} = require('./utils');
const Listr = require('listr');

const spinLoginText = 'login with password';
const spinConnectText = 'start matrix client';
const spinSyncText = 'wait for sync with matrix server\n';

module.exports = class {
    /**
     * @param {object} sdk sdk client
     */
    constructor(sdk) {
        this.sdk = sdk;
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
     * @param {string} domain user domain
     * @param {string} userName user name
     * @param {string} password user password
     */
    async getClient(domain, userName, password) {
        let spinner;

        try {
            const baseUrl = getBaseUrl(domain);
            const userId = getUserId(userName, domain);
            const client = this.sdk.createClient(baseUrl);

            spinner = ora(spinLoginText);
            spinner.start();
            const {access_token: accessToken} = await client.loginWithPassword(userId, password);
            spinner.succeed();

            spinner = ora(spinConnectText);
            spinner.start();
            const matrixClient = this.sdk.createClient({baseUrl, accessToken, userId});
            await matrixClient.startClient({lazyLoadMembers: true});
            spinner.succeed();

            spinner = ora(spinSyncText);
            spinner.start();
            const readyClient = await this._getReadyClient(matrixClient);
            spinner.succeed();

            return readyClient;
        } catch (error) {
            spinner.fail();
            console.error(error);
            throw error;
        }
    }

    /**
     * @param {object} matrixClient matrix client
     * @param {number} limit timestamp limit date
     * @param {array|undefined} ignoreUsers user to ignore in events
     */
    async getRooms(matrixClient, limit, ignoreUsers = []) {
        const rooms = await matrixClient.getRooms();
        return getRoomsLastUpdate(rooms, limit, ignoreUsers);
    }

    /**
     * @param {object} matrixClient matrix client
     * @return {function} lambda function which returns element to Listr
     */
    _getTask(matrixClient) {
        return ({roomId, roomName}) => {
            const title = `Leaving room ${roomName}`;
            const task = () => matrixClient.leave(roomId);

            return {title, task};
        };
    }

    /**
     * @param {object} matrixClient matrix client
     * @param {array} rooms matrix rooms from getRooms
     */
    async leaveRooms(matrixClient, rooms) {
        // TEST ONLY
        // const [expectedRoom] = rooms;
        // const preparedTasks = [expectedRoom].map(_getTask(matrixClient));
        try {
            const preparedTasks = rooms.map(this._getTask(matrixClient));
            const tasks = new Listr(preparedTasks, {concurrent: true, exitOnError: false});

            await tasks.run();
        } catch (err) {
            return err.errors;
        }
    }
};
