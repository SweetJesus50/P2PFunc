import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, Dictionary, DictionaryKey, toNano } from '@ton/core';
import { Arbitrator } from '../wrappers/Arbitrator';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Arbitrator', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Arbitrator');
    });

    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let moderator1: SandboxContract<TreasuryContract>;
    let moderator2: SandboxContract<TreasuryContract>;
    let moderator3: SandboxContract<TreasuryContract>;
    let arbitrator: SandboxContract<Arbitrator>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = 2000000000;

        owner = await blockchain.treasury('deployer');
        moderator1 = await blockchain.treasury('moderator1');
        moderator2 = await blockchain.treasury('moderator2');
        moderator3 = await blockchain.treasury('moderator3');

        let moderatorlist: Dictionary<Address, boolean> = Dictionary.empty();
        moderatorlist.set(moderator1.address, false);

        arbitrator = blockchain.openContract(Arbitrator.createFromConfig({
            ownerAddress: owner.address,
            moderators: moderatorlist
        }, code));

        const deployResult = await arbitrator.sendDeploy(owner.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: arbitrator.address,
            deploy: true,
            success: true,
        });

        expect(await arbitrator.getOwnerAddress()).toEqualAddress(owner.address);
        expect(await arbitrator.getIsModerator(moderator1.address)).toBeTruthy();
    });

    it('should deploy & check storage', async () => {
        // the check is done inside beforeEach
        // blockchain and arbitrator are ready to use
    });

    it('should add moderator', async() => {
        expect(await arbitrator.getIsModerator(moderator2.address)).toBeFalsy()
        let transactionRes = await arbitrator.sendAddModerator(owner.getSender(), moderator2.address);
        expect(transactionRes.transactions).toHaveTransaction({
            from: owner.address,
            to: arbitrator.address,
            op: 1,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: arbitrator.address,
            to: owner.address,
            success: true,
            op: 0,
            body: beginCell().storeUint(0, 32).storeStringTail("Moderator added successfully").endCell()
        })
        expect(await arbitrator.getIsModerator(moderator2.address)).toBeTruthy()
    });

    it('should remove moderator', async() => {
        expect(await arbitrator.getIsModerator(moderator1.address)).toBeTruthy()
        let transactionRes = await arbitrator.sendRemoveModerator(owner.getSender(), moderator1.address);
        expect(transactionRes.transactions).toHaveTransaction({
            from: owner.address,
            to: arbitrator.address,
            op: 2,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: arbitrator.address,
            to: owner.address,
            success: true,
            op: 0,
            body: beginCell().storeUint(0, 32).storeStringTail("Moderator removed successfully").endCell()
        })
        expect(await arbitrator.getIsModerator(moderator1.address)).toBeFalsy()
    });
    
    it('should change moderators list', async() => {
        let moderatorToAdd1: SandboxContract<TreasuryContract>
        let moderatorToAdd2: SandboxContract<TreasuryContract>
        let moderatorToAdd3: SandboxContract<TreasuryContract>
        let moderatorToAdd4: SandboxContract<TreasuryContract>
        let moderatorToAdd5: SandboxContract<TreasuryContract>

        let moderators_arr = [
            moderatorToAdd1 = await blockchain.treasury('moderatorToAdd1'),
            moderatorToAdd2 = await blockchain.treasury('moderatorToAdd2'),
            moderatorToAdd3 = await blockchain.treasury('moderatorToAdd3'),
            moderatorToAdd4 = await blockchain.treasury('moderatorToAdd4'),
            moderatorToAdd5 = await blockchain.treasury('moderatorToAdd5')
        ]

        let newModeratorsList: Dictionary<Address, Boolean> = Dictionary.empty()

        for(let moders of moderators_arr) {
            newModeratorsList.set(moders.address, false)
        } 
        
        expect(newModeratorsList.size).toEqual(moderators_arr.length)

        let transactionRes = await arbitrator.sendChangeModeratorList(owner.getSender(), newModeratorsList)

        expect(transactionRes.transactions).toHaveTransaction({
            from: owner.address,
            to: arbitrator.address,
            op: 3,
            success: true
        })

        for(let newmoders of newModeratorsList) {
            expect(await arbitrator.getIsModerator(newmoders[0])).toBeTruthy()
        }

        expect(await arbitrator.getIsModerator(moderator1.address)).toBeFalsy()
    });
});
