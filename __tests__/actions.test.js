const { random } = require('faker');
const ask = require('../src/lib/questions');
const { actions: act } = require('../src/lib/utils');
const MatrixService = require('../src/lib/matrix-service');
const Actions = require('../src/lib/actions');
const { sdkStub, correctLength, matrixClientStub, allRooms, users } = require('./fixtures/fake-sdk');
const { stub, assert } = require('sinon');

describe('Testing actions for bin', () => {
    jest.setTimeout(30000);
    const message = random.words;

    let askMock;
    let actions;
    let matrixServiceMock;

    beforeAll(() => {
        askMock = stub(ask);
        askMock.limitMonths.resolves('10');
        askMock.inputUsers.resolves([]);
        askMock.isShowRooms.resolves(true);
        askMock.isLeave.resolves(true);
        askMock.selectRoomsToInvite.resolves([]);
        askMock.isInvite.resolves(true);
        const options = {
            domain: 'domain',
            userName: 'userName',
            password: 'password',
            sdk: sdkStub(matrixClientStub),
            sliceAmount: 2,
            delayTime: 20,
        };

        matrixServiceMock = new MatrixService(options);
        actions = new Actions(matrixServiceMock, askMock);
    });

    describe('Test leave method', () => {
        it('Expect leave works correct with all correct data', async () => {
            const res = await actions[act.leaveByDate]();
            expect(res.errors.length).toEqual(1);
            expect(res.leavedRooms.length).toEqual(correctLength - 1);
        });

        it('Expect send works correct if no room we select', async () => {
            const res = await actions[act.send]();
            assert.notCalled(matrixClientStub.sendTextMessage);

            expect(res).toBeUndefined();
        });

        it('Expect send dont send any message if no input we pass', async () => {
            askMock.selectRoomsToInvite.resolves(allRooms);
            const res = await actions[act.send]();
            assert.notCalled(matrixClientStub.sendTextMessage);
            expect(res).toBeUndefined();
        });

        it('Expect send works correct if all rooms we select', async () => {
            askMock.selectRoomsToInvite.resolves(allRooms);
            askMock.inputMessage.resolves(message);
            const res = await actions[act.send]();

            assert.callCount(matrixClientStub.sendTextMessage, allRooms.length);
            allRooms.map(({ roomId }) => assert.calledWith(matrixClientStub.sendTextMessage, roomId, message));
            expect(res).toBeUndefined();
        });

        it('Expect invite user returns undefined if no room is choosen', async () => {
            askMock.selectRoomsToInvite.resolves([]);
            const res = await actions[act.invite]();
            expect(res).toBeUndefined();
        });

        it('Expect invite user returns undefined if no user is choosen', async () => {
            const res = await actions[act.invite]();
            expect(res).toBeUndefined();
        });

        it('Expect invite works well', async () => {
            askMock.selectRoomsToInvite.resolves(allRooms);
            askMock.userToInvite.resolves(users[0]);
            const res = await actions[act.invite]();
            expect(res).toEqual({ invitedUser: users[0], inviteRooms: allRooms });
        });

        it('Expect invite works well', async () => {
            const res = await actions[act.getRoomsInfo]();
            expect(res).toEqual({
                allRooms: allRooms.map(room => matrixServiceMock._parseRoom(room)),
                singleRoomsManyMessages: [],
                singleRoomsNoMessages: [],
                manyMembersNoMessages: [],
                manyMembersManyMessages: allRooms.map(room => matrixServiceMock._parseRoom(room)),
            });
        });
    });
});
