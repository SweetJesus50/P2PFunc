import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { P2PJetton } from '../wrappers/P2PJetton';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { buildOnchainMetadata } from '../wrappers/onChain';
import { JettonMaster } from '../wrappers/JettonMaster';
import { JettonWallet } from '../wrappers/JettonWallet';
import { randomAddress } from '@ton/test-utils';

describe('P2PJetton', () => {
    let code: Cell;
    let jettonMasterCode: Cell;
    let jettonWalletCode: Cell;

    beforeAll(async () => {
        code = await compile('P2PJetton');
        jettonMasterCode = await compile('JettonMaster');
        jettonWalletCode = await compile('JettonWallet')
    });

    let blockchain: Blockchain;
    let arbitrator: SandboxContract<TreasuryContract>;
    let lessor: SandboxContract<TreasuryContract>
    let renter: SandboxContract<TreasuryContract>
    let p2p: SandboxContract<P2PJetton>;
    let jettonMaster: SandboxContract<JettonMaster>
    let renterJettonWallet: SandboxContract<JettonWallet>

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        blockchain.now = 2000000000

        arbitrator = await blockchain.treasury('arbitrator')
        lessor = await blockchain.treasury('lessor')
        renter = await blockchain.treasury('renter')

        jettonMaster = blockchain.openContract(JettonMaster.createFromConfig({
            admin: arbitrator.address,
            content: Cell.EMPTY,
            wallet_code: jettonWalletCode
        }, jettonMasterCode))

        let deployMaster = await jettonMaster.sendDeploy(arbitrator.getSender(), toNano("0.05"))

        expect(deployMaster.transactions).toHaveTransaction({
            from: arbitrator.address,
            to: jettonMaster.address,
            deploy: true,
            success: true
        })

        await jettonMaster.sendMint(arbitrator.getSender(), renter.address, 100n, 1n, toNano("0.1"))

        renterJettonWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMaster.getWalletAddressOf(renter.address)))

        expect((await renterJettonWallet.getJettonWalletData()).balance).toEqual(100n)

        p2p = blockchain.openContract(P2PJetton.createFromConfig({
            arbitratorAddress: arbitrator.address,
            lessorAddress: lessor.address,
            renterAddress: renter.address,
            content: buildOnchainMetadata({item_name: "Snowboard", image: "image_link"}),
            depositSize: 50n,
            cost: 50n,                            // Jettons
            arbitratorFeePercent: toNano("0.03"), // 3%
            rentTime: 3600                        // 1 hour
        }, code));

        let deployResult = await p2p.sendDeploy(arbitrator.getSender(), toNano('0.05'), Address.parse((await jettonMaster.getWalletAddressOf(p2p.address)).toString()));
        
        expect(await p2p.getJettonWalletAddress()).toEqualAddress(await jettonMaster.getWalletAddressOf(p2p.address))

        expect(deployResult.transactions).toHaveTransaction({
            from: arbitrator.address,
            to: p2p.address,
            deploy: true,
            success: true,
        });

        // deposit

        let deposit = await renterJettonWallet.sendTransfer(renter.getSender(), toNano("0.05"), {
            queryId: 123,
            jettonAmount: 50n,
            toAddress: p2p.address,
            forwardTonAmount: toNano("0.1"),
            forwardPayload: beginCell().storeUint(0, 32).storeStringTail("Deposit").endCell()
        })

        let p2pwallet = blockchain.openContract(JettonWallet.createFromAddress(await p2p.getJettonWalletAddress()))

        expect(((await p2pwallet.getJettonWalletData()).balance)).toEqual(50n)

        expect(deposit.transactions).toHaveTransaction({
            from: p2p.address,
            to: renter.address,
            body: beginCell().storeUint(0, 32).storeStringTail("Deposit successful").endCell(),
            success: true
        })

        expect((await p2p.getStorage()).deposit).toEqual(50n)
    });

    it('should deploy & send deposit', async () => {
        // the check is done inside beforeEach
        // blockchain and p2PJetton are ready to use
    });
    it('should receive payment from renter & end rent (no delay)', async () => {
        blockchain.now!! += 3600
        let transactionRes = await p2p.sendFinish(lessor.getSender(), toNano("0.05"))
        
        expect((await p2p.getStorage()).request).toBeTruthy()

        const cost = (await p2p.getStorage()).cost

        transactionRes = await renterJettonWallet.sendTransfer(renter.getSender(), toNano("0.05"), { // sending payment
            queryId: 123,
            jettonAmount: cost,
            toAddress: p2p.address,
            forwardTonAmount: toNano("0.055") * 3n,
            forwardPayload: beginCell().storeUint(0, 32).storeStringTail("Payment").endCell()
        })

        expect((await p2p.getStorage()).ended).toBeTruthy()
    })
    it('should receive payment from renter & end rent (with delay)', async () => {
        blockchain.now!! += 3600
        let transactionRes = await p2p.sendFinish(lessor.getSender(), toNano("0.05"))
        
        expect((await p2p.getStorage()).delayTime).toEqual(blockchain.now!! + 5400) // `delayTime` = `rentTime` + 5400 (1 hour 30 minutes)
        expect((await p2p.getStorage()).request).toBeTruthy()

        blockchain.now!! += 5401 // 1 hour since rentTime passed -> payment delayed -> take deposit from renter and send it to lessor

        const cost = (await p2p.getStorage()).cost

        transactionRes = await renterJettonWallet.sendTransfer(renter.getSender(), toNano("0.05"), { // sending payment
            queryId: 123,
            jettonAmount: cost,
            toAddress: p2p.address,
            forwardTonAmount: toNano("0.055") * 3n,
            forwardPayload: beginCell().storeUint(0, 32).storeStringTail("Payment").endCell()
        })

        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: renter.address,
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Payment was delayed. You are fined.").endCell()
        })

        expect((await p2p.getStorage()).ended).toBeTruthy()
    })
    
    // OTHER TESTS ARE DONE IN P2P.FC BC THEY HAVE THE SAME LOGIC AS IN BASIC P2P (NO JETTON)
});
