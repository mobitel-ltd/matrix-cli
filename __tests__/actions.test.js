const { random, name } = require('faker');
const { getParsedRooms } = require('../src/lib/utils');
const ask = require('../src/lib/questions');
const MatrixService = require('../src/lib/matrix-service');
const Actions = require('../src/lib/actions');
const {
    sdkStub,
    correctLength,
    createMatrixClientStub,
    existedAlias,
    roomId,
    fakeDomain,
    existsMember,
    mainUserName,
} = require('./fixtures/fake-sdk');
const { stub, assert } = require('sinon');

describe('Testing actions for bin', () => {
    // jest.setTimeout(5000);
    const message = random.words;

    /**  @type {Actions} action */
    const ignoreUsers = [name.firstName(), name.firstName()];

    let actions;
    let matrixService;
    const stubMatrixData = createMatrixClientStub(ignoreUsers);
    const matrixClientStub = stubMatrixData.matrixClientStub;
    const allRooms = stubMatrixData.allRooms;
    const manyMembersNoMessages = stubMatrixData.manyMembersNoMessages;
    const manyMembersManyMessages = stubMatrixData.manyMembersManyMessages;

    const allRoomsWithMember = allRooms
        .map(getParsedRooms(ignoreUsers))
        .filter(({ members }) => members.includes(existsMember))
        .map(({ roomId, roomName }) => ({ roomId, roomName }));

    const userToInvite = 'some_user';
    const askMock = stub(ask);

    beforeEach(() => {
        askMock.limitMonths.resolves('10');
        askMock.inputUsers.resolves([]);
        askMock.isShowRooms.resolves(true);
        askMock.isInvite.resolves(true);

        const options = {
            domain: fakeDomain,
            userName: mainUserName,
            password: 'password',
            sdk: sdkStub(matrixClientStub),
            sliceAmount: 2,
            delayTime: 5,
            ignoreUsers,
        };

        matrixService = new MatrixService(options);
        actions = new Actions(matrixService, askMock);
    });

    afterEach(() => {
        Object.values(askMock).map(el => el.reset());
        matrixClientStub.leave.resetHistory();
    });

    describe('Test leaveByDate', () => {
        it('Expect leaveByDate return undefined if invite is not agree', async () => {
            expect(await actions.leaveByDate()).toBeUndefined();
        });

        it('Expect leaveByDate works correct with all correct data and invite agree', async () => {
            askMock.isLeave.resolves(true);
            const { errors, leavedRooms, errLeavedRooms } = await actions.leaveByDate();

            expect(errors).toHaveLength(1);
            expect(leavedRooms).toHaveLength(correctLength - 1);
            expect(errLeavedRooms).toHaveLength(1);
        });
    });

    describe('Test leaveEmpty', () => {
        it('Expect leaveEmpty return undefined single rooms dont exists', async () => {
            const res = await actions.leaveEmpty();
            expect(res).toBeUndefined();
        });
    });

    describe('Test invite', () => {
        beforeEach(() => {
            askMock.selectStrategy.resolves('allRooms');
            askMock.selectRooms.callsFake(data => Promise.resolve(data));
            askMock.selectUserStrategy.resolves('print');
            askMock.inputOne.resolves();
        });

        it('Expect invite user returns undefined if no room is choosen', async () => {
            askMock.selectRooms.resolves([]);
            const res = await actions.invite();

            expect(res).toBeUndefined();
        });

        it('Expect invite user returns undefined if no user is choosen', async () => {
            const res = await actions.invite();
            expect(res).toBeUndefined();
        });

        it('Expect invite works well', async () => {
            askMock.inputOne.resolves(userToInvite);
            const res = await actions.invite();
            expect(res).toEqual({
                invitedUser: matrixService.getUserId(userToInvite),
                invitedRooms: allRooms.map(({ roomId, name }) => ({ roomId, roomName: name })),
                errInvitedRooms: [],
                errors: [],
            });
        });

        it('Expect invite only singleRoomsManyMessages return undefined because no one is find', async () => {
            askMock.selectStrategy.resolves('singleRoomsManyMessages');
            const res = await actions.invite();
            expect(res).toBeUndefined();
        });

        it('Expect invite only manyMembersNoMessages invite to only this rooms', async () => {
            askMock.selectStrategy.resolves('manyMembersNoMessages');
            askMock.inputOne.resolves(userToInvite);
            const res = await actions.invite();
            expect(res).toEqual({
                invitedUser: matrixService.getUserId(userToInvite),
                invitedRooms: manyMembersNoMessages.map(({ roomId, name }) => ({ roomId, roomName: name })),
                errInvitedRooms: [],
                errors: [],
            });
        });
    });

    describe('Test send', () => {
        it('Expect send works correct if no room we select', async () => {
            askMock.selectRooms.resolves([]);
            const res = await actions.send();
            assert.notCalled(matrixClientStub.sendTextMessage);

            expect(res).toBeUndefined();
        });

        it('Expect send dont send any message if no input we pass', async () => {
            askMock.selectRooms.resolves(allRooms);
            const res = await actions.send();
            assert.notCalled(matrixClientStub.sendTextMessage);
            expect(res).toBeUndefined();
        });

        it('Expect send works correct if all rooms we select', async () => {
            askMock.selectRooms.resolves(allRooms);
            askMock.inputMessage.resolves(message);
            const res = await actions.send();

            assert.callCount(matrixClientStub.sendTextMessage, allRooms.length);
            allRooms.map(({ roomId }) => assert.calledWith(matrixClientStub.sendTextMessage, roomId, message));
            expect(res).toBeUndefined();
        });
    });

    describe('Test getRooms', () => {
        it('Expect get rooms info returns grouped data', async () => {
            const res = await actions.getRoomsInfo();
            expect(res).toEqual({
                allRooms: allRooms.map(getParsedRooms(ignoreUsers)),
                singleRoomsManyMessages: [],
                singleRoomsNoMessages: [],
                manyMembersNoMessages: manyMembersNoMessages.map(getParsedRooms(ignoreUsers)),
                manyMembersManyMessages: manyMembersManyMessages.map(getParsedRooms(ignoreUsers)),
            });
        });
    });

    describe('Test getRoomByAlias', () => {
        it('Expect getRoomByAlias works well and return roomId if alias is exists', async () => {
            askMock.inputRoomAlias.resolves(existedAlias);
            const res = await actions.getIdByAlias();
            expect(res).toEqual(roomId);
        });

        it('Expect getRoomByAlias return undefined if alias is not exists', async () => {
            askMock.inputRoomAlias.resolves(random.word());
            const res = await actions.getIdByAlias();
            expect(res).toBeUndefined();
        });
    });

    describe('Test leaveByMember', () => {
        beforeEach(() => {
            askMock.selectUserStrategy.resolves('print');
        });

        it('Expect leaveByMember return undefined if user is not input', async () => {
            const res = await actions.leaveByMember();
            expect(res).toBeUndefined();
        });

        it('Expect leaveByMember return undefined if user is not exists in any room', async () => {
            askMock.inputOne.resolves(userToInvite);
            const res = await actions.leaveByMember();
            expect(res).toBeUndefined();
        });

        it('Expect leaveByMember return undefined if we not agree with leaving', async () => {
            askMock.inputOne.resolves(existsMember);
            askMock.selectRooms.callsFake(data => Promise.resolve(data));
            const res = await actions.leaveByMember();
            expect(res).toBeUndefined();
        });

        it('Expect leaveByMember all rooms leaved where user is joined member', async () => {
            askMock.inputOne.resolves(existsMember);
            askMock.selectRooms.callsFake(data => Promise.resolve(data));
            askMock.isLeave.resolves(true);

            const { leavedRooms, errLeavedRooms, errors } = await actions.leaveByMember();

            expect(errors).toHaveLength(1);
            expect(leavedRooms).toHaveLength(allRoomsWithMember.length - 1);
            expect(errLeavedRooms).toHaveLength(1);
        });
    });

    describe('Test setPower', () => {
        beforeEach(() => {
            askMock.selectUserStrategy.resolves('print');
        });

        it('Expect setPower return undefined if we no user is input', async () => {
            const res = await actions.setPower();
            expect(res).toBeUndefined();
        });
    });
});
