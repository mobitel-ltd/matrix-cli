const moment = require('moment');
const fake = require('faker');
// const delay = require('delay');
const Service = require('../src/lib/matrix-service');
const { stub } = require('sinon');
const EventEmitter = require('events');
const { getBaseUrl, getUserId } = require('../src/lib/utils');

const startDate = '2017-01-01';
const ignoreUserName = 'some_user';
const getEvent = period => () => {
    const date = fake.date.between(...period);
    return {
        getTs: () => new Date(date).getTime(),
        getDate: () => date,
        getSender: () => fake.random.arrayElement([`@${ignoreUserName}1:matrix`, `@${ignoreUserName}2:matrix`]),
    };
};

const getRoom = period => () => ({
    currentState: {
        getMembers: () => ['roomMember', 'roomMember', 'roomMember'],
    },
    roomId: fake.random.uuid(),
    name: fake.random.word(),
    timeline: Array.from({ length: 10 }, getEvent(period)),
});

const createRooms = (length, period) => Array.from({ length }, getRoom(period));

describe('test leave', () => {
    const accessToken = 'accessToken';
    const domain = 'domain';
    const password = 'password';
    const userName = 'userName';
    const baseUrl = getBaseUrl(domain);
    const userId = getUserId(userName, domain);

    const matrixClientStub = new EventEmitter();
    matrixClientStub.startClient = () => {
        // console.log('START!!!');
        setTimeout(() => matrixClientStub.emit('sync', 'SYNCING'), 1000);
    };
    const getRoomsStub = stub();
    const leaveStub = stub();

    matrixClientStub.getRooms = getRoomsStub;
    matrixClientStub.leave = leaveStub;

    const loginWithPassword = stub();

    const sdkStub = {
        createClient: opts => {
            if (typeof opts === 'string') {
                return stub()
                    .withArgs(baseUrl)
                    .returns({ loginWithPassword })(opts);
            }
            return matrixClientStub;
        },
    };

    const options = {
        domain,
        userName,
        password,
        sdk: sdkStub,
        sliceAmount: 2,
        delayTime: 20,
    };

    const service = new Service(options);

    beforeEach(() => {
        loginWithPassword.withArgs(userId, password).resolves({ access_token: accessToken });
    });

    afterEach(() => {
        loginWithPassword.reset();
        getRoomsStub.reset();
        leaveStub.reset();
    });

    it('expect work correct', async () => {
        const client = await service.getClient();
        expect(client).toBeTruthy();
    });

    it('expect throw error if smth wrong', async () => {
        const fakeService = new Service({ ...options, password: 'fakepassword' });
        let res;
        let client;
        try {
            client = await fakeService.getClient();
            // console.error(client);
        } catch (error) {
            res = error;
        }
        expect(client).toBeUndefined;
        expect(res).toBeTruthy();
    });

    it('expect getRooms work correct if no user we add', async () => {
        const limit = 10;
        const correctLength = 1;
        const endDate = moment().subtract(limit, 'months');
        const oldRooms = createRooms(correctLength, [startDate, endDate.subtract(1, 'day').format('YYYY-MM-DD')]);
        const newRooms = createRooms(10, [endDate.add(1, 'day').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')]);

        getRoomsStub.resolves([...oldRooms, ...newRooms]);

        const rooms = await service.getRooms(limit, undefined);
        expect(rooms.length).toBe(correctLength);
        rooms.map(room => Object.keys(room).map(key => expect(room[key]).toBeTruthy()));
    });

    it('expect getRooms work correct if we put users as string', async () => {
        const limit = 10;
        const correctLength = 10;
        const endDate = moment().subtract(limit, 'months');
        const oldRooms = createRooms(correctLength, [startDate, endDate.subtract(1, 'day').format('YYYY-MM-DD')]);

        getRoomsStub.resolves(oldRooms);

        const rooms = await service.getRooms(limit, 'lalalalla');
        expect(rooms.length).toBe(correctLength);
    });

    it('expect getRooms return no rooms if all events are made by ignore users which contain put string', async () => {
        const limit = 10;
        const correctLength = 10;
        const endDate = moment().subtract(limit, 'months');
        const oldRooms = createRooms(correctLength, [startDate, endDate.subtract(1, 'day').format('YYYY-MM-DD')]);

        getRoomsStub.resolves(oldRooms);

        const rooms = await service.getRooms(limit, ignoreUserName);
        expect(rooms.length).toBe(0);
    });

    it('expect leaveRooms work well with correct rooms', async () => {
        const limit = 10;
        const correctLength = 10;
        const endDate = moment().subtract(limit, 'months');
        const oldRooms = createRooms(correctLength, [startDate, endDate.subtract(1, 'day').format('YYYY-MM-DD')]);
        getRoomsStub.resolves(oldRooms);

        const rooms = await service.getRooms(limit);
        const res = await service.leaveRooms(rooms);
        expect(res).toBeUndefined;
    });

    it('expect leaveRooms work until all rooms handled if one of them is thrown', async () => {
        leaveStub.onFirstCall().rejects(new Error());
        leaveStub.onSecondCall().rejects(new Error());
        const limit = 10;
        const correctLength = 5;
        const endDate = moment().subtract(limit, 'months');
        const oldRooms = createRooms(correctLength, [startDate, endDate.subtract(1, 'day').format('YYYY-MM-DD')]);
        getRoomsStub.resolves(oldRooms);

        const rooms = await service.getRooms(limit);
        const { errors, leavedRooms } = await service.leaveRooms(rooms);
        expect(leavedRooms.length).toBe(3);
        expect(errors.length).toBe(2);
    });
});
