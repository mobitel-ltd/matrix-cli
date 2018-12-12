const MatrixService = require('../src/lib/matrix-service');
const Actions = require('../src/lib/actions');
const fakeSdk = require('./fixtures/fake-sdk');
const {stub} = require('sinon');

describe('Testing actions for bin', () => {
    const options = {
        domain: 'domain',
        userName: 'userName',
        password: 'password',
        sdk: fakeSdk,
    };

    const askMock = {
        limitMonths: stub().resolves('10'),
        inputUsers: stub().resolves([]),
        isShowRooms: stub().resolves(true),
        isLeave: stub().resolves(true),
    };

    const matrixServiceMock = new MatrixService(options);
    const actions = new Actions(matrixServiceMock, askMock);

    describe('Test leave method', () => {
        it('Expect leave works correct with all correct data', async () => {
            const res = await actions.leave();
            expect(res).toBeFalsy();
        });
    });
});
